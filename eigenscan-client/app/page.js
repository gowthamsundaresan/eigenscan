"use client"
import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { IBM_Plex_Mono } from "next/font/google"
import ReactHtmlParser from "react-html-parser"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
const ibm = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["100", "200", "300", "400", "500", "600", "700"],
})

export default function Home() {
    const [userData, setUserData] = useState()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(25)
    const [totalCount, setTotalCount] = useState(0)
    const [searchTerm, setSearchTerm] = useState("")
    const [searchColumn, setSearchColumn] = useState("event")
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [AVSs, setAVSs] = useState(0)
    const [Operators, setOperators] = useState(0)
    const [Stakers, setStakers] = useState(0)
    const [TVL, setTVL] = useState(0)

    const toggleDropdown = () => setDropdownOpen(!dropdownOpen)

    const fetchEvents = async () => {
        setLoading(true)
        let query = supabase
            .from("eigenevents")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })

        if (searchTerm && searchColumn) {
            query = query.ilike(searchColumn, `%${searchTerm}%`)
        }

        const { data, error, count } = await query.range((page - 1) * perPage, page * perPage - 1)

        if (error) {
            console.error("Error fetching events:", error.message)
        } else {
            setEvents(data)
            setTotalCount(Math.min(count, 10000))
        }
        setLoading(false)
    }

    const totalPages = Math.ceil(totalCount / perPage)

    const handlePerPageChange = (e) => {
        setPerPage(Number(e.target.value))
        setPage(1)
    }

    function formatTxHash(hash) {
        return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`
    }

    function formatMessageWithLinks(message) {
        const ethAddressRegex = /([^a-fA-F0-9]|^)(0x[a-fA-F0-9]{40})([^a-fA-F0-9]|$)/g
        const urlRegex = /(https?:\/\/(?!etherscan\.io)[^\s]+)/g

        message = message.replace(ethAddressRegex, (match, p1, p2, p3) => {
            const truncated = `${p2.substring(0, 6)}...${p2.substring(p2.length - 4)}`

            const prefix = /[^a-fA-F0-9]/.test(p1) ? p1 : ""
            const suffix = /[^a-fA-F0-9]/.test(p3) ? p3 : ""
            const link = `<a href="https://etherscan.io/address/${p2}" target="_blank" rel="noopener noreferrer" class="text-blue-300 underline">${truncated}</a>`

            return `${prefix}${link}${suffix}`
        })
        message = message.replace(urlRegex, (url) => {
            url = url.replace(/[.,!?;]*$/, "")
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-300 underline">this</a>`
        })
        return message
    }

    function formatDate(dateString) {
        const date = new Date(dateString)
        return date
            .toLocaleString("en-GB", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
                timeZone: "UTC",
            })
            .replace(",", "")
    }

    function shouldDisplayEvent(newEvent) {
        if (!searchTerm) return true
        const searchValue = newEvent[searchColumn]?.toLowerCase()
        return searchValue && searchValue.includes(searchTerm.toLowerCase())
    }

    useEffect(() => {
        const signIn = async () => {
            let { data, error } = await supabase.auth.signInWithPassword({
                email: process.env.NEXT_PUBLIC_EMAIL_ID,
                password: process.env.NEXT_PUBLIC_PASSWORD,
            })
            if (error) {
                setAuthError(error.message)
            } else {
                setUserData(data)
            }
        }

        signIn()
    }, [])

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchEvents()
        }, 300)

        return () => clearTimeout(delayDebounce)
    }, [searchTerm, page, perPage])

    useEffect(() => {
        const fetchLatestData = async () => {
            const { data, error } = await supabase
                .from("eigendata")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(1)

            if (error) {
                console.error("Error fetching initial data: ", error)
            } else if (data && data.length > 0) {
                setTVL(data[0].tvl_eth)
                setAVSs(data[0].number_avs)
                setOperators(data[0].number_operator)
                setStakers(data[0].number_staker)
            }
        }

        fetchLatestData()

        const eigendataSubscription = supabase
            .channel("eigendata")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "eigendata" },
                (payload) => {
                    setTVL(payload.new.tvl_eth)
                    setAVSs(payload.new.number_avs)
                    setOperators(payload.new.number_operator)
                    setStakers(payload.new.number_staker)
                },
            )
            .subscribe()

        return () => {}
    }, [])

    useEffect(() => {
        const subscription = supabase
            .channel("eigenevents")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "eigenevents" },
                (payload) => {
                    if (shouldDisplayEvent(payload.new)) {
                        setEvents((currentEvents) =>
                            [payload.new, ...currentEvents].slice(0, perPage),
                        )
                    }
                },
            )
            .subscribe()

        return () => {}
    }, [perPage, searchTerm, searchColumn])

    return (
        <div className="text-white">
            <div className="lg:px-24 md:px-16 px-4">
                <div className="flex items-center mt-4">
                    <img src="markDarkA.svg" alt="Icon" className="mr-4 max-w-12" />
                    <div className="flex items-center w-full px-1 py-1 bg-white border rounded-md text-xs font-repro">
                        <div className="relative inline-block text-left text-eigen-dark-blue">
                            <button
                                onClick={toggleDropdown}
                                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                                type="button"
                                id="menu-button"
                                aria-expanded={dropdownOpen}
                                aria-haspopup="true"
                            >
                                {searchColumn == "message"
                                    ? "Details"
                                    : searchColumn.charAt(0).toUpperCase() + searchColumn.slice(1)}
                                <svg
                                    className="-mr-1 ml-2 h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                            {dropdownOpen && (
                                <div
                                    className="origin-top-right absolute right--4 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                                    role="menu"
                                    aria-orientation="vertical"
                                    aria-labelledby="menu-button"
                                    tabIndex="-1"
                                >
                                    <div className="py-1" role="none">
                                        <a
                                            href="#"
                                            className="text-gray-700 block px-4 py-2"
                                            role="menuitem"
                                            tabIndex="-1"
                                            id="menu-item-0"
                                            onClick={() => {
                                                setSearchColumn("transactionHash")
                                                setDropdownOpen(false)
                                            }}
                                        >
                                            Transaction Hash
                                        </a>
                                        <a
                                            href="#"
                                            className="text-gray-700 block px-4 py-2"
                                            role="menuitem"
                                            tabIndex="-1"
                                            id="menu-item-1"
                                            onClick={() => {
                                                setSearchColumn("event")
                                                setDropdownOpen(false)
                                            }}
                                        >
                                            Event
                                        </a>
                                        <a
                                            href="#"
                                            className="text-gray-700 block px-4 py-2"
                                            role="menuitem"
                                            tabIndex="-1"
                                            id="menu-item-2"
                                            onClick={() => {
                                                setSearchColumn("message")
                                                setDropdownOpen(false)
                                            }}
                                        >
                                            Details
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow px-4 py-2 bg-white focus:outline-none text-eigen-dark-blue"
                        />
                    </div>
                </div>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div>
                        <div className="flex flex-col sm:flex-row gap-2 mt-8 mb-8">
                            <div
                                className={`border border-eigen-med-blue-2 bg-eigen-med-blue-2 rounded-lg flex-1 justify-center items-center py-4 px-4 ${ibm.className}`}
                            >
                                <div className="text-center text-eigen-light-blue md:mb-2">TVL</div>
                                <div className="text-center text-white  text-xl">{TVL} ETH</div>
                            </div>
                            <div
                                className={`border border-eigen-med-blue-2 bg-eigen-med-blue-2 rounded-lg flex-1 justify-center items-center py-4 ${ibm.className}`}
                            >
                                <div className="text-center text-eigen-light-blue md:mb-2">
                                    AVSs
                                </div>
                                <div className="text-center text-white text-xl">{AVSs}</div>
                            </div>
                            <div
                                className={`border border-eigen-med-blue-2 bg-eigen-med-blue-2 rounded-lg flex-1 justify-center items-center py-4 ${ibm.className}`}
                            >
                                <div className="text-center text-eigen-light-blue md:mb-2">
                                    Operators
                                </div>
                                <div className="text-center text-white text-xl">{Operators}</div>
                            </div>
                            <div
                                className={`border border-eigen-med-blue-2 bg-eigen-med-blue-2 rounded-lg flex-1 justify-center items-center py-4 ${ibm.className}`}
                            >
                                <div className="text-center text-eigen-light-blue md:mb-2">
                                    Stakers
                                </div>
                                <div className="text-center text-white text-xl">{Stakers}</div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className={`w-full ${ibm.className}`}>
                                <thead className="bg-eigen-light-blue text-eigen-dark-blue text-xs">
                                    <tr>
                                        <th className="text-left py-2 px-4">Tx</th>
                                        <th className="text-left py-2 px-4">Event</th>
                                        <th className="text-left py-2 px-4">Details</th>
                                        <th className="text-left py-2 px-4">Block</th>
                                        <th className="text-left py-2 px-4">Time (UTC)</th>
                                    </tr>
                                </thead>
                                <tbody className="border-b border-gray-700 text-xs">
                                    {events.map((event, index) => (
                                        <tr
                                            key={index}
                                            className="border-t border-gray-700 hover:bg-eigen-med-blue-3"
                                        >
                                            <td className="py-2 px-4">
                                                <a
                                                    href={`https://etherscan.io/tx/${event.transactionHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-300 underline"
                                                >
                                                    {formatTxHash(event.transactionHash)}
                                                </a>
                                            </td>
                                            <td className="py-2 px-4">{event.event}</td>
                                            <td className="py-2 px-4">
                                                {ReactHtmlParser(
                                                    formatMessageWithLinks(event.message),
                                                )}
                                            </td>
                                            <td className="py-2 px-4">
                                                <a
                                                    href={`https://etherscan.io/block/${event.blockNumber}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-300 underline"
                                                >
                                                    {event.blockNumber}
                                                </a>
                                            </td>
                                            <td className="py-2 px-4">
                                                {formatDate(event.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <div className="flex flex-col md:flex-row justify-between items-center py-4 text-xs font-repro">
                    <div className="mt-4 mb-4 md:mt-0 md:mb-0">
                        Show{" "}
                        <select
                            value={perPage}
                            onChange={handlePerPageChange}
                            className="bg-eigen-dark-blue text-white"
                        >
                            {[10, 25, 50, 100].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>{" "}
                        records
                    </div>
                    <div>
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                            className="border p-1 bg-eigen-light-blue hover:bg-eigen-dark-blue text-eigen-dark-blue hover:text-eigen-light-blue rounded-md mr-2"
                        >
                            First
                        </button>
                        <button
                            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                            disabled={page === 1}
                            className="border p-1 bg-eigen-light-blue hover:bg-eigen-dark-blue text-eigen-dark-blue hover:text-eigen-light-blue rounded-md mr-2"
                        >
                            Previous
                        </button>
                        <span className="border p-2 border-eigen-light-blue rounded-md mr-2">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={page === totalPages}
                            className="border p-1 bg-eigen-light-blue hover:bg-eigen-dark-blue text-eigen-dark-blue hover:text-eigen-light-blue rounded-md mr-2"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages}
                            className="border p-1 bg-eigen-light-blue hover:bg-eigen-dark-blue text-eigen-dark-blue hover:text-eigen-light-blue rounded-md"
                        >
                            Last
                        </button>
                    </div>
                </div>
            </div>
            <div
                className={`bg-eigen-very-dark-blue p-6 flex items-center justify-center ${ibm.className}`}
            >
                <div className="text-center text-xs">
                    Made with ❤️ for Ethereum |{" "}
                    <span className="underline text-eigen-light-blue">
                        <a
                            href="https://github.com/gowthamsundaresan/eigenscan"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {" "}
                            GitHub
                        </a>
                    </span>
                </div>
            </div>
        </div>
    )
}
