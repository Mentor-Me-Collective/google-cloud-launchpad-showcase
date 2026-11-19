<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Offer checks live in src/lib/verify/engine.ts as pure TS rules (no React/DOM) so they stay unit-testable; file extraction (pdfjs/tesseract) is dynamically imported, browser-only.
- Completed navigation to /verify remounts its verification attempt, including same-route links, so transient offer, upload and checklist state cannot leak into a new check.
- Email ownership is derived from explicit address labels; only recruiter/contact addresses feed sender-domain checks, while ambiguous addresses remain unattributed to avoid applicant-driven warnings.
- User data (offers, verification_reports, comparisons) is read/written from the browser Supabase client in src/lib/offers.ts; owner-only RLS is the security boundary, so no service-role code is needed.
- Guest offers wait in localStorage (text only) and are imported after sign-in by useImportPending on /history and /compare; the engine re-runs deterministically.
- Comparison rules live in src/lib/compare/engine.ts (pure, tested); safety signals stay separate from career-fit rows and missing data is shown, never inferred.
- Evidence selections are validated as a batch and extracted sequentially into one text before analysis; failed files block the batch to prevent partial reports, and image previews use revocable local object URLs.
- Every "Compare Offers" affordance renders through src/components/site/CompareOffersLink.tsx (target logic in src/lib/compare-target.ts) so guests are sent to login with a redirect back to /compare and signed-in users reach /compare directly; never link to /compare directly from a public page.
