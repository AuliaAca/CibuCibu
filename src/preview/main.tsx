/** Static preview entry: the same <CibuApp/> without the Next.js server. */
import { createRoot } from "react-dom/client";
import CibuApp from "@/components/CibuApp";

createRoot(document.getElementById("root")!).render(<CibuApp />);
