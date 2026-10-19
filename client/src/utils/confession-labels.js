export function recipientLabel(data) {
  return data?.is_automated || data?.content?.startsWith("[Automated fiction]")
    ? "Short Stories"
    : data?.recipient_to;
}
