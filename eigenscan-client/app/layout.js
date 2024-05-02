import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
    title: "Eigenscan | Blockexplorer for EigenLayer",
    description:
        "Eigenscan allows you explore and search the EigenLayer ecosystem for transactions, events and data on AVSs, Operators & Stakers.",
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    )
}
