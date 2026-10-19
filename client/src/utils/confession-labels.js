export function recipientLabel(data) {
  return data?.is_automated || data?.content?.startsWith("[Automated fiction]")
    ? "Short Stories"
    : data?.recipient_to;
}

/**
 * Detects special DSSC executive and leadership recipient roles:
 * - College President / Principal: Dr. Augie E. Fuentes
 * - Vice President for Academic Affairs: Dr. Siverlyn M. Camposano
 * - Vice President for Administration and Finance / Budget: Dr. Luciano D. Nasibog, Jr.
 *
 * College Deans per Program:
 * - Institute of Graduate and Professional Education: Dr. Harih G. Lopez
 * - College of Teacher Education: Dr. Cindy B. Rosil
 * - College of Agriculture and Related Sciences: Jade O. Caintic, MSc
 * - College of Business Education and Governance: Dr. Zandro P. Ibañez
 * - College of Computing, Engineering and Technology: Engr. Eduardo F. Aquino, MSME
 * - College of Mathematics, Arts and Sciences: Kris Kristofferson T. Tan, MS
 * - College of Information and Digital Sciences: Dr. Felomino P. Alba
 *
 * Returns metadata object or null if standard student/community recipient.
 */
export function getSpecialRecipientRole(recipient) {
  if (!recipient || typeof recipient !== "string") return null;
  const clean = recipient
    .toLowerCase()
    .replace(/['".,]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  // 1. College President (Dr. Augie E. Fuentes)
  if (
    /\baugie\b/.test(clean) ||
    /\b(dr|dra|doc|dok|maam|mam|madam|pres|president|principal)\s+fuentes\b/.test(
      clean,
    ) ||
    /\b(college|dssc)\s+pres(ident)?\b/.test(clean) ||
    /\b(maam|mam|madam|doc|dok)\s+pres(ident)?\b/.test(clean) ||
    /\b(our|atong)\s+(principal|president|pres)\b/.test(clean) ||
    clean === "principal" ||
    clean === "president" ||
    clean === "pres"
  ) {
    return {
      id: "president",
      role: "president",
      label: "College President",
      shortLabel: "President",
      icon: "👑",
      title: "DSSC College President / Principal (Dr. Augie E. Fuentes)",
      className: "special-tag--president",
    };
  }

  // 2. Vice President for Academic Affairs (Dr. Siverlyn M. Camposano)
  if (
    /\bvpaa\b/.test(clean) ||
    /\bcamposano\b/.test(clean) ||
    /\bsiverlyn\b/.test(clean) ||
    /\b(vp|vice\s*(pres(ident)?|principal))\b.*\b(academic|academics|acad|acads)\b/.test(
      clean,
    ) ||
    /\b(academic|academics|acad|acads)\s*(vp|head|director)\b/.test(clean)
  ) {
    return {
      id: "academic",
      role: "academic",
      label: "VP Academic Affairs",
      shortLabel: "VP Academic",
      icon: "📚",
      title: "DSSC VP for Academic Affairs (Dr. Siverlyn M. Camposano)",
      className: "special-tag--academic",
    };
  }

  // 3. Vice President for Administration & Finance / Budget (Dr. Luciano D. Nasibog, Jr.)
  if (
    /\bvpaf\b/.test(clean) ||
    /\bnasibog\b/.test(clean) ||
    /\bluciano\b/.test(clean) ||
    /\b(vp|vice\s*(pres(ident)?|principal))\b.*\b(budget|finance|admin|administration)\b/.test(
      clean,
    ) ||
    /\b(budget|finance|admin)\s*(vp|head|officer|director)\b/.test(clean)
  ) {
    return {
      id: "finance",
      role: "finance",
      label: "VP Admin & Finance",
      shortLabel: "VP Finance",
      icon: "💼",
      title:
        "DSSC VP for Administration & Finance (Dr. Luciano D. Nasibog, Jr.)",
      className: "special-tag--finance",
    };
  }

  // 4. Dean, Institute of Graduate and Professional Education (Dr. Harih G. Lopez)
  if (
    /\bharih\b/.test(clean) ||
    /\b(dr|dra|doc|dok|maam|mam|dean|prof)\s+lopez\b/.test(clean) ||
    /\bigpe\b/.test(clean) ||
    /\bgraduate\s+school\b/.test(clean) ||
    /\b(dean|head)\s+(of\s+)?(igpe|graduate)\b/.test(clean)
  ) {
    return {
      id: "dean_igpe",
      role: "dean",
      label: "Dean, IGPE",
      shortLabel: "Dean Lopez",
      icon: "🎓",
      title:
        "Dean, Institute of Graduate and Professional Education (Dr. Harih G. Lopez)",
      className: "special-tag--dean special-tag--igpe",
    };
  }

  // 5. Dean, College of Teacher Education (Dr. Cindy B. Rosil)
  if (
    /\bcindy\b/.test(clean) ||
    /\b(dr|dra|doc|dok|maam|mam|dean|prof)\s+rosil\b/.test(clean) ||
    /\bcte\s+dean\b/.test(clean) ||
    /\bdean\s+(of\s+)?cte\b/.test(clean) ||
    /\b(teacher|education)\s+dean\b/.test(clean)
  ) {
    return {
      id: "dean_cte",
      role: "dean",
      label: "Dean, CTE",
      shortLabel: "Dean Rosil",
      icon: "🍎",
      title: "Dean, College of Teacher Education (Dr. Cindy B. Rosil)",
      className: "special-tag--dean special-tag--cte",
    };
  }

  // 6. Dean, College of Agriculture and Related Sciences (Jade O. Caintic, MSc)
  if (
    /\bcaintic\b/.test(clean) ||
    /\bjade\s+caintic\b/.test(clean) ||
    /\b(dean|sir|prof|maam|mam|doc|dok)\s+caintic\b/.test(clean) ||
    /\bcars\s+dean\b/.test(clean) ||
    /\bdean\s+(of\s+)?cars\b/.test(clean) ||
    /\b(agriculture|agri)\s+dean\b/.test(clean)
  ) {
    return {
      id: "dean_cars",
      role: "dean",
      label: "Dean, CARS",
      shortLabel: "Dean Caintic",
      icon: "🌾",
      title:
        "Dean, College of Agriculture and Related Sciences (Jade O. Caintic, MSc)",
      className: "special-tag--dean special-tag--cars",
    };
  }

  // 7. Dean, College of Business Education and Governance (Dr. Zandro P. Ibañez)
  if (
    /\bzandro\b/.test(clean) ||
    /\biba[nñ]ez\b/.test(clean) ||
    /\b(dr|doc|dok|dean|sir|prof)\s+iba[nñ]ez\b/.test(clean) ||
    /\bcbeg\s+dean\b/.test(clean) ||
    /\bdean\s+(of\s+)?cbeg\b/.test(clean) ||
    /\b(business|governance)\s+dean\b/.test(clean)
  ) {
    return {
      id: "dean_cbeg",
      role: "dean",
      label: "Dean, CBEG",
      shortLabel: "Dean Ibañez",
      icon: "📈",
      title:
        "Dean, College of Business Education and Governance (Dr. Zandro P. Ibañez)",
      className: "special-tag--dean special-tag--cbeg",
    };
  }

  // 8. Dean, College of Computing, Engineering and Technology (Engr. Eduardo F. Aquino, MSME)
  if (
    /\beduardo\s+aquino\b/.test(clean) ||
    /\b(engr|engineer|dean|sir|prof)\s+aquino\b/.test(clean) ||
    /\bccet\s+dean\b/.test(clean) ||
    /\bdean\s+(of\s+)?ccet\b/.test(clean) ||
    /\b(engineering|computing)\s+dean\b/.test(clean)
  ) {
    return {
      id: "dean_ccet",
      role: "dean",
      label: "Dean, CCET",
      shortLabel: "Dean Aquino",
      icon: "⚙️",
      title:
        "Dean, College of Computing, Engineering and Technology (Engr. Eduardo F. Aquino, MSME)",
      className: "special-tag--dean special-tag--ccet",
    };
  }

  // 9. Dean, College of Mathematics, Arts and Sciences (Kris Kristofferson T. Tan, MS)
  if (
    /\bkristofferson\b/.test(clean) ||
    /\bkris\s+tan\b/.test(clean) ||
    /\bkris\s+kristofferson\b/.test(clean) ||
    /\b(dean|prof)\s+tan\b/.test(clean) ||
    /\bcmas\s+dean\b/.test(clean) ||
    /\bdean\s+(of\s+)?cmas\b/.test(clean) ||
    /\b(arts|sciences|cmas)\s+dean\b/.test(clean)
  ) {
    return {
      id: "dean_cmas",
      role: "dean",
      label: "Dean, CMAS",
      shortLabel: "Dean Tan",
      icon: "🔬",
      title:
        "Dean, College of Mathematics, Arts and Sciences (Kris Kristofferson T. Tan, MS)",
      className: "special-tag--dean special-tag--cmas",
    };
  }

  // 10. Dean, College of Information and Digital Sciences (Dr. Felomino P. Alba)
  if (
    /\bfelomino\b/.test(clean) ||
    /\balba\b/.test(clean) ||
    /\b(dr|doc|dok|dean|sir|prof)\s+alba\b/.test(clean) ||
    /\bcids\s+dean\b/.test(clean) ||
    /\bdean\s+(of\s+)?cids\b/.test(clean) ||
    /\b(digital|information)\s+sciences\s+dean\b/.test(clean)
  ) {
    return {
      id: "dean_cids",
      role: "dean",
      label: "Dean, CIDS",
      shortLabel: "Dean Alba",
      icon: "💻",
      title:
        "Dean, College of Information and Digital Sciences (Dr. Felomino P. Alba)",
      className: "special-tag--dean special-tag--cids",
    };
  }

  return null;
}
