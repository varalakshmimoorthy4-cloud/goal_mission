import { useEffect } from "react";

// Sets the browser tab title for the current page (helps accessibility and navigation).
export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Goal Mission` : "Goal Mission";
  }, [title]);
}
