import dotenv from "dotenv"
dotenv.config()

import EigenEvents from "eigenevents/EigenEvents.js"
import Web3 from "web3"
import { createClient } from "@supabase/supabase-js"
import puppeteer from "puppeteer"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let { signInData, signInError } = await supabase.auth.signInWithPassword({
    email: process.env.EMAIL_ID,
    password: process.env.PASSWORD,
})
if (signInError) {
    console.log(signInError.message)
} else {
    console.log("Signed in...")
}

const tvlUrl = "https://app.eigenlayer.xyz"
const rpcUrl = process.env.ALCHEMY_RPC_URL
const eigenEventsHistoric = new EigenEvents(rpcUrl, "http")
const web3 = new Web3(rpcUrl)

const fromBlock = 19492759
const toBlock = "latest"
const blockInterval = 20000

async function fetchKPIs() {
    let currentBlock = fromBlock
    const latestBlock = await web3.eth.getBlockNumber()
    let avsData = []
    let operatorData = []
    const stakerData = new Set()
    let tvl = ""

    // TVL
    try {
        console.log("Fetching TVL data with Puppeteer...")

        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.goto(tvlUrl, { waitUntil: "networkidle0" })
        await page.waitForSelector(
            "span.text-ShortTextL.font-ibmPlexMono.items-center.hidden.sm\\:flex",
        )

        tvl = await page.evaluate(() => {
            const element = document.querySelector(
                "span.text-ShortTextL.font-ibmPlexMono.items-center.hidden.sm\\:flex",
            )
            const match = element ? element.innerText.match(/^[\d,\.]+/) : null
            return match ? match[0] : "Element not found"
        })

        console.log("TVL: ", tvl)

        await browser.close()
    } catch (error) {
        console.error("Error fetching TVL with Puppeteer: ", error)
    }

    // No of AVSs
    try {
        console.log("Fetching AVS data...")
        const uniqueMetadataURIs = new Set()
        const historicalAVSData =
            (await eigenEventsHistoric.getAVSMetadataURIUpdatedEvents(fromBlock, toBlock)) || []
        avsData = historicalAVSData.filter((event) => {
            const avs = event.returnValues.avs
            const metadataURI = event.returnValues.metadataURI
            if (!stakerData.has(avs) && !uniqueMetadataURIs.has(metadataURI)) {
                stakerData.add(avs)
                uniqueMetadataURIs.add(metadataURI)
                return true
            }
            return false
        })
        console.log("No of AVSs: ", avsData.length)
    } catch (error) {
        console.error("Error fetching events: ", error)
    }

    // No of Operators
    try {
        console.log("Fetching Operator data...")
        operatorData =
            (await eigenEventsHistoric.getOperatorRegisteredEvents(fromBlock, toBlock)) || []
        console.log("No of Operators: ", operatorData.length)
    } catch (error) {
        console.error("Error fetching events: ", error)
    }

    // No of Stakers
    console.log("Fetching Staker data...")
    while (currentBlock < latestBlock) {
        try {
            const eventData =
                (await eigenEventsHistoric.getDepositEvents(
                    currentBlock,
                    currentBlock + blockInterval,
                )) || []
            currentBlock += blockInterval

            eventData.forEach((event) => {
                const staker = event.returnValues.staker
                stakerData.add(staker)
            })
            await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
            console.error("Error fetching events:", error)
        }
    }
    console.log("No of Stakers: ", stakerData.size)

    const { data, error } = await supabase
        .from("eigendata")
        .insert([
            {
                tvl_eth: tvl.toString(),
                number_avs: avsData.length.toString(),
                number_operator: operatorData.length.toString(),
                number_staker: stakerData.size.toString(),
            },
        ])
        .select()
    if (!error) {
        console.log("Added to DB: ", data)
    } else {
        console.log("Error adding to DB: ", error)
    }
}

fetchKPIs()
