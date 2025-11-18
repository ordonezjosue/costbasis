import "./globals.css";
import MatrixBackground from "./components/MatrixBackground";

export const metadata = {
  title: "Cost Basis Calculator",
  description: "Matrix style cost basis tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="relative">
        <MatrixBackground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
