import "./globals.css";
import "./print.css";
import "./receipt.css";
export const metadata={title:"CWMS",description:"Chyun Welfare Management System"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
