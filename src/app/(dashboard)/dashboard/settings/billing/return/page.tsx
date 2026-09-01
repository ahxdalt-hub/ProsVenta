import { Suspense } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { PaymentReturnClient } from "./PaymentReturnClient";

export default function PaymentReturnPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        }
      >
        <PaymentReturnClient />
      </Suspense>
    </div>
  );
}
