import type { WhatsAppTemplate } from "../../../services/notify";

export interface TemplateSelection {
  messageId: string;
  variables: string[];
}

export const EMPTY_SELECTION: TemplateSelection = {
  messageId: "",
  variables: [],
};

/** Replaces per-recipient tokens like {name} in variable values. */
export const fillVariables = (
  variables: string[],
  recipient: { name?: string; phone?: string },
) =>
  variables.map((value) =>
    value
      .replace(/\{name\}/gi, recipient.name?.trim() || "Customer")
      .replace(/\{phone\}/gi, recipient.phone || "")
      .trim(),
  );

export const renderTemplate = (
  template: WhatsAppTemplate | undefined,
  variables: string[],
) =>
  template?.body.replace(
    /\{\{\s*(\d+)\s*\}\}/g,
    (match, index) => variables[Number(index) - 1] || match,
  ) || "";

export const selectionError = (
  selection: TemplateSelection,
  template: WhatsAppTemplate | undefined,
) => {
  if (!selection.messageId.trim())
    return "Choose an approved WhatsApp template";
  const needed = template?.variableCount ?? selection.variables.length;
  const missing = Array.from({ length: needed }, (_, index) => index).find(
    (index) => !selection.variables[index]?.trim(),
  );
  return missing === undefined ? null : `Fill in variable {{${missing + 1}}}`;
};
