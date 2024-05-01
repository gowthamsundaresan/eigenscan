import dotenv from "dotenv"
dotenv.config()

import { createClient } from "@supabase/supabase-js"
import EigenEvents from "eigenevents/EigenEvents.js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function signIn() {
    let { data, error } = await supabase.auth.signInWithPassword({
        email: process.env.EMAIL_ID,
        password: process.env.PASSWORD,
    })

    if (error) {
        console.error("Auth error:", error.message)
    } else {
        console.log("User authorized...")
        listenToEvents()
    }
}

async function r(eventData, err) {
    if (eventData) {
        const { data, error } = await supabase
            .from("eigenevents")
            .insert([
                {
                    transactionHash: eventData.transactionHash.toString(),
                    blockNumber: eventData.blockNumber.toString(),
                    event: eventData.event.toString(),
                    returnValues: JSON.parse(JSON.stringify(eventData.returnValues, replacer)),
                    message: eventData.message.toString(),
                },
            ])
            .select()
        if (data) {
            console.log("Event added to DB: ", data)
        } else {
            console.log("Error adding event to DB: ", error)
        }
    } else if (err) {
        console.error("Error receiving data:", err)
    }
}

function replacer(key, value) {
    if (typeof value === "bigint") {
        return value.toString()
    } else {
        return value
    }
}

function handleReconnection() {
    console.log("Reconnection occurred...")
    console.log("Re-initializing event listeners...")
    setEventListeners(eigenEventsRealTime)
}

function listenToEvents() {
    const wsURL = process.env.ALCHEMY_WSS_URL
    const eigenEventsRealTime = new EigenEvents(wsURL, "ws", handleReconnection)
    setEventListeners(eigenEventsRealTime)
}

function setEventListeners(eigenEventsRealTime) {
    console.log("Registering listeners on Ethereum Mainnet...")
    eigenEventsRealTime.getOperatorRegisteredEvents(null, null, true, r)
    eigenEventsRealTime.getOperatorMetadataURIUpdatedEvents(null, null, true, r)
    eigenEventsRealTime.getMinWithdrawalDelayBlocksSetEvents(null, null, true, r)
    eigenEventsRealTime.getOperatorDetailsModifiedEvents(null, null, true, r)
    eigenEventsRealTime.getOperatorSharesDecreasedEvents(null, null, true, r)
    eigenEventsRealTime.getOperatorSharesIncreasedEvents(null, null, true, r)
    eigenEventsRealTime.getStakerDelegatedEvents(null, null, true, r)
    eigenEventsRealTime.getStakerForceUndelegatedEvents(null, null, true, r)
    eigenEventsRealTime.getStakerUndelegatedEvents(null, null, true, r)
    eigenEventsRealTime.getStrategyWithdrawalDelayBlocksSetEvents(null, null, true, r)
    eigenEventsRealTime.getWithdrawalCompletedEvents(null, null, true, r)
    eigenEventsRealTime.getWithdrawalMigratedEvents(null, null, true, r)
    eigenEventsRealTime.getWithdrawalQueuedEvents(null, null, true, r)
    eigenEventsRealTime.getDepositEvents(null, null, true, r)
    eigenEventsRealTime.getOwnershipTransferredEvents(null, null, true, r)
    eigenEventsRealTime.getStrategyAddedToDepositWhitelistEvents(null, null, true, r)
    eigenEventsRealTime.getStrategyRemovedFromDepositWhitelistEvents(null, null, true, r)
    eigenEventsRealTime.getStrategyWhitelisterChangedEvents(null, null, true, r)
    eigenEventsRealTime.getUpdatedThirdPartyTransfersForbiddenEvents(null, null, true, r)
    eigenEventsRealTime.getBeaconChainETHDepositedEvents(null, null, true, r)
    eigenEventsRealTime.getBeaconChainETHWithdrawalCompletedEvents(null, null, true, r)
    eigenEventsRealTime.getBeaconOracleUpdatedEvents(null, null, true, r)
    eigenEventsRealTime.getPodDeployedEvents(null, null, true, r)
    eigenEventsRealTime.getPodSharesUpdatedEvents(null, null, true, r)
    eigenEventsRealTime.getOperatorAVSRegistrationStatusUpdatedEvents(null, null, true, r)
    eigenEventsRealTime.getAVSMetadataURIUpdatedEvents(null, null, true, r)
}

signIn()
