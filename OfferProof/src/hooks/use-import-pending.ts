import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { importPending } from "@/lib/offers";

/** After sign-in, move offers checked as a guest into the account. */
export function useImportPending() {
  const qc = useQueryClient();
  useEffect(() => {
    importPending().then((n) => {
      if (n) {
        toast.success(`${n} offer(s) from your visit were saved to your account.`);
        qc.invalidateQueries();
      }
    });
  }, [qc]);
}
