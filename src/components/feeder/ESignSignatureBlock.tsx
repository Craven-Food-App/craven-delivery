import React, { useEffect, useState } from "react";
import { ShieldCheck, FileText } from "lucide-react";
import { ESIGN_CONSENT_STATEMENT, ESIGN_DISCLOSURE } from "@/lib/feeder/agreements";

export interface ESignSignatureBlockProps {
  /** Title of the document being signed (e.g. "Independent Contractor Agreement"). */
  documentTitle: string;
  /** Full disclosure / agreement text shown in a scrollable preview. */
  documentText: string;
  /** Suggested legal name (prefills the typed-name input). */
  defaultName?: string;
  /** Called every time typed name or consent checkbox change. */
  onChange: (state: { typedName: string; agreed: boolean; isValid: boolean }) => void;
  /** Highlight when the user tried to advance without signing. */
  showError?: boolean;
}

/**
 * Reusable E-SIGN-compliant signature block used at every signing step of
 * Feeder onboarding. Renders the full document text, the E-SIGN disclosure,
 * a typed-name input (the legal signature), and a consent checkbox.
 */
export const ESignSignatureBlock: React.FC<ESignSignatureBlockProps> = ({
  documentTitle,
  documentText,
  defaultName = "",
  onChange,
  showError = false,
}) => {
  const [typedName, setTypedName] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const isValid = typedName.trim().length > 1 && agreed;
    onChange({ typedName: typedName.trim(), agreed, isValid });
  }, [typedName, agreed]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalid = showError && (!agreed || typedName.trim().length < 2);

  return (
    <div className="space-y-4">
      {/* Full document text */}
      <div className="border border-gray-300 rounded-lg bg-white">
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50 rounded-t-lg">
          <FileText className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-gray-800">{documentTitle}</span>
        </div>
        <div className="max-h-56 overflow-y-auto px-4 py-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-serif">
          {documentText}
        </div>
      </div>

      {/* E-SIGN disclosure */}
      <details className="bg-orange-50 border border-orange-200 rounded-lg">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-orange-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          E-SIGN Act Disclosure (tap to read)
        </summary>
        <div className="px-3 pb-3 text-xs text-orange-900 whitespace-pre-wrap leading-relaxed">
          {ESIGN_DISCLOSURE}
        </div>
      </details>

      {/* Consent + typed signature */}
      <div
        className={`rounded-lg border-2 p-4 space-y-3 ${
          invalid ? "border-red-400 bg-red-50" : "border-orange-300 bg-orange-50"
        }`}
      >
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 accent-orange-500 h-4 w-4"
          />
          <span className="text-xs text-gray-800 leading-relaxed">
            {ESIGN_CONSENT_STATEMENT}
          </span>
        </label>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">
            Type your full legal name (electronic signature)
          </label>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="e.g. Jane M. Doe"
            autoComplete="name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {typedName.trim().length > 1 && (
            <div className="mt-2 px-3 py-2 bg-white border border-gray-200 rounded">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Signature preview</div>
              <div
                className="text-2xl text-gray-900 mt-1"
                style={{ fontFamily: "'Brush Script MT','Lucida Handwriting',cursive" }}
              >
                {typedName}
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-600 mt-2 leading-snug">
            Audit trail recorded with your signature: timestamp, IP address, browser, agreement
            version, and the full document text shown above.
          </p>
        </div>
      </div>
    </div>
  );
};