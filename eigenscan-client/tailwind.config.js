/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                repro: ["ABCReproVariable", "sans-serif"],
            },
            colors: {
                "eigen-very-dark-blue": "#0E0548",
                "eigen-dark-blue": "#1A0C6D",
                "eigen-light-blue": "#A7BFFC",
                "eigen-med-blue-1": "#45449D",
                "eigen-med-blue-2": "#353396",
                "eigen-med-blue-3": "#271C7D",
            },
        },
    },
    plugins: [],
}
