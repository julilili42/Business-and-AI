import * as Tooltip from "@radix-ui/react-tooltip";
import { RouterProvider } from "react-router-dom";

import { QueryProvider } from "./providers/QueryProvider";
import { router } from "./router";

export function App() {
  return (
    <QueryProvider>
      <Tooltip.Provider delayDuration={120}>
        <RouterProvider router={router} />
      </Tooltip.Provider>
    </QueryProvider>
  );
}
