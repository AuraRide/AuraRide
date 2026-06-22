import { RouterProvider } from "react-router";
import { router } from "./routes";
import MobileOnly from "./components/MobileOnly";

export default function App() {
  return (
    <MobileOnly>
      <RouterProvider router={router} />
    </MobileOnly>
  );
}