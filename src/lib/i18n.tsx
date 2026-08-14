/** Lightweight i18n (Section XVII) — English, Nigerian Pidgin, Yorùbá.
 *  Zero-dependency context provider; preference persists in localStorage.
 *  Reviews stay in their written language — only UI strings translate. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "pcm" | "yo";

const LANG_KEY = "rentsafe.lang";

export const LANG_META: Record<Lang, { label: string; short: string }> = {
  en: { label: "English", short: "EN" },
  pcm: { label: "Pidgin", short: "PID" },
  yo: { label: "Yorùbá", short: "YO" },
};

/** UI strings. `en` is the key reference; pcm/yo fall back to en when missing. */
const STRINGS: Record<string, { en: string; pcm?: string; yo?: string }> = {
  // Navigation
  "nav.explore": { en: "Explore", pcm: "Waka look", yo: "Ṣàwárí" },
  "nav.review": { en: "Review", pcm: "Talk am", yo: "Àgbéyẹ̀wò" },
  "nav.compare": { en: "Compare", pcm: "Compare", yo: "Fiwéra" },
  "nav.profile": { en: "Profile", pcm: "My side", yo: "Pirofaili" },
  "nav.alerts": { en: "Alerts", pcm: "Alert", yo: "Ìkìlọ̀" },

  // Brand
  "brand.tagline": { en: "Know before you sign", pcm: "Sabi before you sign", yo: "Mọ̀ kí o tó fọwọ́ sí" },
  "brand.mission": {
    en: "Every review helps the next Lagos tenant.",
    pcm: "Every tori wey you drop dey help the next Lagos tenant.",
    yo: "Àgbéyẹ̀wò kọ̀ọ̀kan ń ran ayálegbé Èkó tó kàn lọ́wọ́.",
  },

  // Search / explore
  "search.placeholder": {
    en: "Area, street, or PropertyID…",
    pcm: "Which area you dey check?",
    yo: "Àgbègbè, òpópónà tàbí PropertyID…",
  },
  // Was "Reviewed near you", which claimed a personalisation the app does not
  // do: nothing anywhere reads the user's location, and this list is ordered by
  // review count. Saying so is both honest and more useful — it explains why
  // Lekki is at the top.
  "explore.mostReviewed": {
    en: "Most reviewed in Lagos",
    pcm: "Wey people talk pass for Lagos",
    yo: "Èyí tí a ṣàgbéyẹ̀wò jùlọ ní Èkó",
  },
  "explore.noRentReported": {
    en: "No rent reported",
    pcm: "Nobody talk the rent yet",
    yo: "A kò tíì ròyìn owó ilé",
  },
  "explore.properties": { en: "properties", pcm: "houses", yo: "ilé" },
  "explore.writeReview": { en: "Write a review", pcm: "Drop your tori", yo: "Kọ àgbéyẹ̀wò" },
  "explore.fullReport": { en: "See full property report", pcm: "See the full gist for this house", yo: "Wo ìròyìn ilé ní kíkún" },
  "explore.reviews": { en: "reviews", pcm: "tori", yo: "àgbéyẹ̀wò" },
  "explore.verified": { en: "verified", pcm: "confirmed", yo: "tí a fọwọ́ sí" },

  // Property page
  "prop.tab.reviews": { en: "Reviews", pcm: "Wetin dem talk", yo: "Àgbéyẹ̀wò" },
  "prop.tab.rent": { en: "Rent history", pcm: "Rent history", yo: "Ìtàn owó ilé" },
  "prop.tab.environment": { en: "Environment", pcm: "Area matter", yo: "Àyíká" },
  "prop.tab.commute": { en: "Commute", pcm: "Road", yo: "Ìrìnàjò" },
  "prop.tab.agent": { en: "Agent", pcm: "Agent", yo: "Aṣojú" },
  "prop.ratingBreakdown": { en: "Rating breakdown", pcm: "How dem score am", yo: "Àlàyé ìdíwọ̀n" },
  "prop.seeAll": { en: "See all {n} reviews →", pcm: "See all {n} tori →", yo: "Wo gbogbo àgbéyẹ̀wò {n} →" },
  "prop.loved": { en: "Loved:", pcm: "Wetin e like:", yo: "Ó fẹ́ràn:" },
  "prop.knowBefore": { en: "Know before you rent:", pcm: "Make you sabi before you rent:", yo: "Mọ̀ kí o tó yá:" },
  "prop.verifiedTenant": { en: "✓ Verified tenant", pcm: "✓ Confirmed tenant", yo: "✓ Ayálegbé tòótọ́" },
  "prop.unverified": { en: "Unverified", pcm: "No confirm", yo: "Kò ní ìjẹ́rìí" },
  "prop.livedHere": { en: "Lived here", pcm: "E live here", yo: "Ó gbé níbí" },
  "prop.paid": { en: "paid", pcm: "e pay", yo: "ó san" },

  // Review wizard
  "wizard.title": { en: "How was living here?", pcm: "How this house be?", yo: "Báwo ni gbígbé níbí ṣe rí?" },
  "wizard.subtitle": {
    en: "Tap a score for each. Be honest — future tenants depend on it.",
    pcm: "Tap score for each one. Talk true — person wey dey come depend on am.",
    yo: "Tẹ àmì fún ọ̀kọ̀ọ̀kan. Sọ òtítọ́ — àwọn ayálegbé tó ń bọ̀ gbáralé rẹ.",
  },
  "wizard.continue": { en: "Continue", pcm: "Continue", yo: "Tẹ̀síwájú" },
  "wizard.back": { en: "Back", pcm: "Go back", yo: "Padà" },
  "wizard.submit": { en: "Submit review", pcm: "Send your tori", yo: "Fi àgbéyẹ̀wò ránṣẹ́" },
  "wizard.saveDraft": { en: "Save draft", pcm: "Keep am first", yo: "Fi pamọ́" },
  "wizard.verifyPhone": { en: "Verify your phone to submit", pcm: "Confirm your number make you fit send am", yo: "Jẹ́rìí fóònù rẹ kí o lè fi ránṣẹ́" },
  "wizard.sendCode": { en: "Send code", pcm: "Send code", yo: "Fi kóòdù ránṣẹ́" },

  // Rating scale. Bare 1–5 buttons gave no anchor: nothing said which end was
  // good, or what a 3 meant, and ten dimensions of that is fifty unanchored
  // decisions. Naming each point makes the scale self-describing.
  "rate.1": { en: "Terrible", pcm: "Very bad", yo: "Búburú gan" },
  "rate.2": { en: "Poor", pcm: "Bad", yo: "Kò dára" },
  "rate.3": { en: "Okay", pcm: "Manageable", yo: "Ó ṣe é ṣe" },
  "rate.4": { en: "Good", pcm: "Good", yo: "Ó dára" },
  "rate.5": { en: "Excellent", pcm: "Correct well well", yo: "Ó dára gan" },
  "rate.worst": { en: "Terrible", pcm: "Very bad", yo: "Búburú" },
  "rate.best": { en: "Excellent", pcm: "Correct", yo: "Ó dára gan" },
  "rate.notRated": { en: "Not rated yet", pcm: "You never rate am", yo: "A kò tíì díwọ̀n" },
  // All ten are required by the API, so saying so here — rather than at the
  // Continue button — is the honest version. (Making dimensions optional would
  // be the better product, but it changes the submission schema and the score
  // aggregation, so it is a separate decision.)
  "rate.allRequired": {
    en: "All ten are needed. Rate on what you experienced, not what you heard.",
    pcm: "You need rate all ten. Rate wetin you see yourself, no be wetin dem tell you.",
    yo: "Gbogbo mẹ́wàá ni a nílò. Díwọ̀n lórí ohun tí o ní ìrírí rẹ̀, kì í ṣe ohun tí o gbọ́.",
  },

  // Chips / badges
  "chip.floodHigh": { en: "FLOOD: HIGH", pcm: "FLOOD DEY: WELL WELL", yo: "ÌKÚN OMI: GA" },
  "chip.highTurnover": { en: "HIGH TURNOVER", pcm: "PEOPLE DEY COMOT QUICK", yo: "ÌYÍPADÀ GA" },

  // Environment tab
  "env.profile": { en: "Environmental profile", pcm: "Area gist", yo: "Àlàyé àyíká" },
  "env.floodHistory": {
    en: "Flood history — tenant reported",
    pcm: "Flood tori — na tenants talk am",
    yo: "Ìtàn ìkún omi — láti ọ̀dọ̀ ayálegbé",
  },

  // Commute tab
  "commute.where": { en: "Where do you work?", pcm: "Where you dey work?", yo: "Níbo ni o ti ń ṣiṣẹ́?" },
  "commute.reported": {
    en: "What tenants actually report",
    pcm: "Wetin tenants really dey experience",
    yo: "Ohun tí àwọn ayálegbé ń rí gan-an",
  },
  "commute.transit": {
    en: "Public transport access",
    pcm: "Bus, BRT and keke matter",
    yo: "Ọ̀nà ìrìnnà gbogbogbò",
  },

  // Trust strip
  "trust.realTenants": { en: "Real tenants only", pcm: "Na real tenants only", yo: "Ayálegbé tòótọ́ nìkan" },
  "trust.evidence": { en: "Evidence-backed reviews", pcm: "Tori wey get proof", yo: "Àgbéyẹ̀wò pẹ̀lú ẹ̀rí" },
  "trust.free": { en: "Free for tenants, forever", pcm: "Free for tenants, no wahala", yo: "Ọ̀fẹ́ fún ayálegbé títí láé" },

  // Empty & error states
  "error.title": { en: "We couldn't load this", pcm: "We no fit load am", yo: "A kò lè gbé èyí wọlé" },
  "error.retry": { en: "Try again", pcm: "Try am again", yo: "Gbìyànjú lẹ́ẹ̀kansi" },
  "error.properties": {
    en: "The property list didn't load. Check your connection and try again.",
    pcm: "The house list no load. Check your network make you try again.",
    yo: "Àtòjọ ilé kò gbé wọlé. Yẹ ìsopọ̀ rẹ wò kí o sì gbìyànjú lẹ́ẹ̀kansi.",
  },
  "error.property": {
    en: "This property's details didn't load. Check your connection and try again.",
    pcm: "This house details no load. Check your network make you try again.",
    yo: "Àlàyé ilé yìí kò gbé wọlé. Yẹ ìsopọ̀ rẹ wò kí o sì gbìyànjú lẹ́ẹ̀kansi.",
  },
  "error.reviews": {
    en: "The reviews didn't load. Check your connection and try again.",
    pcm: "The tori dem no load. Check your network make you try again.",
    yo: "Àwọn àgbéyẹ̀wò kò gbé wọlé. Yẹ ìsopọ̀ rẹ wò kí o sì gbìyànjú lẹ́ẹ̀kansi.",
  },
  "error.agent": {
    en: "This agent's profile didn't load. Check your connection and try again.",
    pcm: "This agent profile no load. Check your network make you try again.",
    yo: "Pirofaili aṣojú yìí kò gbé wọlé. Yẹ ìsopọ̀ rẹ wò kí o sì gbìyànjú lẹ́ẹ̀kansi.",
  },
  "explore.noMatches": { en: "No properties match", pcm: "No house match", yo: "Kò sí ilé tó bá a mu" },
  "explore.noMatchesHint": {
    en: "Try removing a filter to widen the search.",
    pcm: "Comot one filter make the search open small.",
    yo: "Gbìyànjú láti yọ ọ̀kan nínú àwọn àṣàyàn kúrò.",
  },
  "explore.clearFilters": { en: "Clear filters", pcm: "Clear the filters", yo: "Pa àwọn àṣàyàn rẹ́" },
  "prop.noReviewsTitle": {
    en: "No reviews yet",
    pcm: "Nobody don talk yet",
    yo: "Kò sí àgbéyẹ̀wò síbẹ̀",
  },
  "prop.noReviewsBody": {
    en: "Be the first tenant to share what living here is really like.",
    pcm: "Be the first tenant wey go talk how this place really be.",
    yo: "Jẹ́ ayálegbé àkọ́kọ́ tí yóò sọ bí gbígbé níbí ṣe rí gan-an.",
  },
  "prop.highTurnover": {
    en: "High tenant turnover.",
    pcm: "People dey comot quick.",
    yo: "Ìyípadà ayálegbé ga.",
  },
  "prop.highTurnoverBody": {
    en: "Rent here has risen +{rent}% against an area average of +{area}%.",
    pcm: "Rent for here don rise +{rent}% while the area average na +{area}%.",
    yo: "Owó ilé níbí ti gòkè +{rent}% nígbà tí àpapọ̀ àgbègbè jẹ́ +{area}%.",
  },

  // Review wizard (continued)
  "wizard.whichProperty": {
    en: "Which property are you reviewing?",
    pcm: "Which house you wan talk about?",
    yo: "Ilé wo ni o ń ṣe àgbéyẹ̀wò rẹ̀?",
  },
  "wizard.sessionExpired": {
    en: "Your session expired. Verify your phone again to submit.",
    pcm: "Your session don expire. Confirm your number again make you send am.",
    yo: "Ìgbà ìlò rẹ ti pari. Jẹ́rìí fóònù rẹ lẹ́ẹ̀kansi láti fi ránṣẹ́.",
  },
  "wizard.submitFailed": {
    en: "Couldn't submit that review. Try again in a moment.",
    pcm: "We no fit send the review. Try am again small time.",
    yo: "A kò lè fi àgbéyẹ̀wò yẹn ránṣẹ́. Gbìyànjú lẹ́ẹ̀kansi.",
  },
  "wizard.addYourAddress": {
    en: "Can't find it? Add your address",
    pcm: "You no see am? Add your address",
    yo: "O kò rí i? Fi àdírẹ́sì rẹ kún un",
  },
  "wizard.addressPlaceholder": {
    en: "Street, estate or landmark…",
    pcm: "Street, estate or landmark…",
    yo: "Òpópónà, ilé tàbí àmì ibì kan…",
  },
  "wizard.addressHint": {
    en: "Search the street your building is on. If someone has already added it, you'll be attached to the same record.",
    pcm: "Search the street wey your house dey. If person don add am before, na the same record you go join.",
    yo: "Wá òpópónà tí ilé rẹ wà. Bí ẹnìkan bá ti fi kún un, ìwọ yóò darapọ̀ mọ́ àkọsílẹ̀ kan náà.",
  },
  "wizard.addressOutsideCoverage": {
    en: "Outside the areas RentSafe covers yet",
    pcm: "This area never dey RentSafe yet",
    yo: "Ní ìta àwọn agbègbè tí RentSafe ń bò",
  },
  "wizard.addressNoMatch": {
    en: "No Lagos address matches “{q}”. Try the street name on its own.",
    pcm: "No Lagos address match “{q}”. Try the street name alone.",
    yo: "Kò sí àdírẹ́sì Èkó tó bá “{q}” mu. Gbìyànjú orúkọ òpópónà nìkan.",
  },
  // --- Push notifications --------------------------------------------------
  "push.title": {
    en: "Notifications on this device",
    pcm: "Notification for this phone",
    yo: "Ìfitónilétí lórí ẹ̀rọ yìí",
  },
  "push.explain": {
    en: "Get a notification when something happens in an area you watch — a new review, a flood report, an agent flagged.",
    pcm: "We go notify you when something happen for area wey you dey watch — new review, flood report, or agent wey dem flag.",
    yo: "Gba ìfitónilétí nígbà tí nǹkan bá ṣẹlẹ̀ ní agbègbè tí o ń ṣọ́ — àtúnyẹ̀wò tuntun, ìròyìn ìkún omi, tàbí aṣojú tí a fàmì sí.",
  },
  "push.turnOn": { en: "Turn on", pcm: "Put am on", yo: "Tan án" },
  "push.turnOff": { en: "Turn off", pcm: "Off am", yo: "Pa á" },
  "push.unsupported": {
    en: "This browser can't show notifications. Try adding RentSafe to your home screen.",
    pcm: "This browser no fit show notification. Try add RentSafe to your home screen.",
    yo: "Ẹ̀rọ aṣàwákiri yìí kò lè fi ìfitónilétí hàn. Gbìyànjú láti fi RentSafe sí ojú-ìwé ilé rẹ.",
  },
  "push.notEnabled": {
    en: "Notifications aren't switched on for this deployment yet.",
    pcm: "Dem never put notification on for this one yet.",
    yo: "A kò tíì tan ìfitónilétí fún ìdásílẹ̀ yìí.",
  },
  "push.blocked": {
    en: "You blocked notifications for RentSafe. Your browser settings are the only place that can be undone.",
    pcm: "You block notification for RentSafe. Na only for your browser settings you fit undo am.",
    yo: "O ti dí ìfitónilétí RentSafe lọ́wọ́. Ibi ètò aṣàwákiri rẹ nìkan ni o ti lè yí padà.",
  },

  // --- Agent directory -----------------------------------------------------
  "agents.title": { en: "Agents", pcm: "Agents", yo: "Àwọn aṣojú" },
  "agents.subtitle": {
    en: "Look up an agent before you pay them anything. Fees are shown against the area average.",
    pcm: "Check the agent before you pay them any money. We dey show their fee against wetin the area dey collect.",
    yo: "Ṣàyẹ̀wò aṣojú kan kí o tó san owó kankan fún un. A ń fi owó iṣẹ́ wọn wé àpapọ̀ agbègbè náà.",
  },
  "agents.searchPlaceholder": {
    en: "Agent or agency name…",
    pcm: "Agent or agency name…",
    yo: "Orúkọ aṣojú tàbí ilé-iṣẹ́…",
  },
  "agents.results": { en: "Results", pcm: "Wetin we find", yo: "Àbájáde" },
  "agents.allAgents": { en: "All agents", pcm: "All the agents", yo: "Gbogbo aṣojú" },
  "agents.noneTitle": { en: "No agents found", pcm: "We no see any agent", yo: "A kò rí aṣojú kankan" },
  "agents.noneBody": {
    en: "Nobody matching “{q}” has been named in a review yet. Agents appear here once a tenant names them.",
    pcm: "Nobody wey match “{q}” don show for any review yet. Agent go show here once tenant mention them.",
    yo: "Kò sí ẹni tí ó bá “{q}” mu nínú àtúnyẹ̀wò kankan síbẹ̀. Aṣojú yóò farahàn níbí bí ayálégbé bá dárúkọ wọn.",
  },
  "agents.noneYetBody": {
    en: "Agents appear here once a tenant names them in a review.",
    pcm: "Agent go show here once tenant mention them for review.",
    yo: "Aṣojú yóò farahàn níbí bí ayálégbé bá dárúkọ wọn nínú àtúnyẹ̀wò.",
  },
  "agents.lasrera": { en: "LASRERA verified", pcm: "LASRERA confirm am", yo: "LASRERA fọwọ́ sí i" },
  "agents.flagged": { en: "Flagged", pcm: "We don flag am", yo: "A ti fi àmì sí i" },
  "agents.noAreas": { en: "No areas recorded yet", pcm: "We never get their area", yo: "A kò tíì kọ agbègbè sílẹ̀" },

  "rent.benchmarkLabel": {
    en: "Nigeria, all rents",
    pcm: "Nigeria, all rent",
    yo: "Nàìjíríà, gbogbo owó ilé",
  },
  "rent.benchmarkNote": {
    en: "Official rent inflation to {month} {year}, published by the National Bureau of Statistics. National — NBS does not break the rent index down by state.",
    pcm: "Na official rent inflation reach {month} {year}, from National Bureau of Statistics. Na for whole Nigeria — NBS no dey break am down by state.",
    yo: "Ìfẹ̀ owó ilé ìjọba dé {month} {year}, láti ọ̀dọ̀ National Bureau of Statistics. Ti gbogbo orílẹ̀-èdè — NBS kò pín in ní ìpínlẹ̀.",
  },

  // --- Fee checker ---------------------------------------------------------
  "fees.title": { en: "Is this fee normal?", pcm: "This fee make sense?", yo: "Ṣé owó yìí bọ́gbọ́n mu?" },
  "fees.subtitle": {
    en: "Agent and agreement fees are quoted as a share of annual rent. Put in what you have been asked for and see how it compares to what tenants in that area actually report.",
    pcm: "Dem dey quote agent and agreement fee as percentage of yearly rent. Put wetin dem ask you, make you see how e take compare with wetin tenants for that area dey report.",
    yo: "A ń fi owó aṣojú àti owó àdéhùn wé ìdá owó ilé ọdún. Fi ohun tí wọ́n béèrè lọ́wọ́ rẹ sí i kí o sì rí bí ó ṣe wé ohun tí àwọn ayálégbé agbègbè náà ròyìn.",
  },
  "fees.exploreHint": {
    en: "Check an agent or agreement fee before you pay it",
    pcm: "Check the agent or agreement fee before you pay",
    yo: "Ṣàyẹ̀wò owó aṣojú tàbí àdéhùn kí o tó san án",
  },
  "fees.whatQuoted": { en: "What you were quoted", pcm: "Wetin dem tell you", yo: "Ohun tí wọ́n sọ fún ọ" },
  "fees.annualRent": { en: "Annual rent", pcm: "Yearly rent", yo: "Owó ilé ọdọọdún" },
  "fees.agentFee": { en: "Agent fee", pcm: "Agent fee", yo: "Owó aṣojú" },
  "fees.agreementFee": { en: "Agreement fee", pcm: "Agreement fee", yo: "Owó àdéhùn" },
  "fees.cautionFee": { en: "Caution deposit", pcm: "Caution fee", yo: "Owó ìṣọ́ra" },
  "fees.area": { en: "Area (optional)", pcm: "Area (if you sabi)", yo: "Agbègbè (yíyàn)" },
  "fees.areaAny": { en: "Anywhere in Lagos", pcm: "Anywhere for Lagos", yo: "Níbikíbi ní Èkó" },
  "fees.startTitle": { en: "Enter the rent to start", pcm: "Put the rent make we start", yo: "Fi owó ilé sí i láti bẹ̀rẹ̀" },
  "fees.startBody": {
    en: "Nothing is saved and you don't need an account.",
    pcm: "We no dey save anything and you no need account.",
    yo: "A kò fi ohunkóhun pamọ́, o kò sì nílò àkántì.",
  },
  "fees.ofAnnualRent": { en: "of annual rent", pcm: "of the yearly rent", yo: "nínú owó ilé ọdún" },
  "fees.totalUpfront": { en: "Total to pay upfront", pcm: "Total wey you go pay first", yo: "Àpapọ̀ tí a ó san ní ìbẹ̀rẹ̀" },
  "fees.totalNote": {
    en: "That is {pct}% of one year's rent, due before you move in.",
    pcm: "Na {pct}% of one year rent be that, before you enter house.",
    yo: "Ìyẹn jẹ́ {pct}% owó ilé ọdún kan, ṣáájú kí o tó wọlé.",
  },
  "fees.benchmarkSource": {
    en: "Compared against {pct}% — the average agent fee reported in {area}.",
    pcm: "We compare am with {pct}% — na the average agent fee wey people report for {area}.",
    yo: "A fiwé {pct}% — àpapọ̀ owó aṣojú tí a ròyìn ní {area}.",
  },
  "fees.acrossLagos": { en: "Lagos", pcm: "Lagos", yo: "Èkó" },
  "fees.share": { en: "Send on WhatsApp", pcm: "Send am for WhatsApp", yo: "Fi ránṣẹ́ lórí WhatsApp" },
  "fees.shared": { en: "Opened WhatsApp", pcm: "WhatsApp don open", yo: "A ti ṣí WhatsApp" },
  "fees.shareIntro": {
    en: "I checked these fees on RentSafe Lagos:",
    pcm: "I check these fees for RentSafe Lagos:",
    yo: "Mo ṣàyẹ̀wò àwọn owó wọ̀nyí lórí RentSafe Lagos:",
  },
  "fees.disclaimer": {
    en: "These are customary figures and tenant-reported averages, not legal limits. What an agent may charge is a matter for LASRERA and your tenancy agreement.",
    pcm: "Na the usual figures and wetin tenants report, no be law. Wetin agent fit charge na LASRERA and your tenancy agreement matter.",
    yo: "Àwọn wọ̀nyí jẹ́ àpẹẹrẹ àṣà àti àpapọ̀ láti ọ̀dọ̀ ayálégbé, kì í ṣe òfin. LASRERA àti àdéhùn ìyáleèlé rẹ ni ó pinnu ohun tí aṣojú lè gbà.",
  },

  // --- Agent profile claim -------------------------------------------------
  "claim.title": { en: "Is this you?", pcm: "Na you be this?", yo: "Ṣé ìwọ ni èyí?" },
  "claim.body": {
    en: "If this is your profile, you can claim it and reply to reviews. We check LASRERA and company details by hand first — replying as a named agent is not something we hand out on request.",
    pcm: "If na your profile, you fit claim am and reply the reviews. We go check LASRERA and company details first — we no dey just give person the right to talk as agent.",
    yo: "Bí èyí bá jẹ́ pirofaili rẹ, o lè gbà á kí o sì dáhùn àwọn àtúnyẹ̀wò. A máa ń ṣàyẹ̀wò LASRERA àti àwọn àlàyé ilé-iṣẹ́ ní ọwọ́ ṣáájú.",
  },
  "claim.cta": { en: "Claim this profile", pcm: "Claim this profile", yo: "Gba pirofaili yìí" },
  "claim.submit": { en: "Send claim", pcm: "Send am", yo: "Fi ìbéèrè ránṣẹ́" },
  "claim.lasreraPlaceholder": {
    en: "LASRERA number (if you have one)",
    pcm: "LASRERA number (if you get am)",
    yo: "Nọ́mbà LASRERA (bí o bá ní)",
  },
  "claim.emailPlaceholder": {
    en: "Email we can reach you on",
    pcm: "Email wey we fit reach you",
    yo: "Ímeèlì tí a lè fi kàn ọ́",
  },
  "claim.notePlaceholder": {
    en: "Anything that helps us verify you — CAC number, office address, website",
    pcm: "Anything wey go help us confirm you — CAC number, office address, website",
    yo: "Ohunkóhun tí yóò ràn wá lọ́wọ́ láti fọwọ́ sí ọ — nọ́mbà CAC, àdírẹ́sì ọ́fíìsì, wẹ́bùsáìtì",
  },
  "claim.signInFirst": {
    en: "Verify your phone number first, then come back to claim this profile.",
    pcm: "Confirm your number first, then come back to claim am.",
    yo: "Kọ́kọ́ jẹ́rìí nọ́mbà fóònù rẹ, kí o padà wá gbà pirofaili yìí.",
  },
  "claim.alreadyClaimed": {
    en: "This profile is managed by the agent.",
    pcm: "Na the agent dey manage this profile.",
    yo: "Aṣojú náà ni ó ń ṣàkóso pirofaili yìí.",
  },

  // --- Editing your own review ---------------------------------------------
  "review.edit": { en: "Edit", pcm: "Change am", yo: "Ṣàtúnṣe" },
  "review.withdraw": { en: "Withdraw", pcm: "Comot am", yo: "Yọ ọ kúrò" },
  "review.cancel": { en: "Cancel", pcm: "Leave am", yo: "Fagilé" },
  "review.saveChanges": { en: "Save changes", pcm: "Save am", yo: "Fi àwọn ìyípadà pamọ́" },
  "review.hoursLeft": {
    en: "{n}h left to change this",
    pcm: "{n}h remain make you fit change am",
    yo: "Wákàtí {n} ló kù láti yí èyí padà",
  },
  "review.positivesLabel": { en: "What was good", pcm: "Wetin good", yo: "Ohun tí ó dára" },
  "review.warningsLabel": {
    en: "What future tenants should know",
    pcm: "Wetin next tenant suppose sabi",
    yo: "Ohun tí àwọn ayálégbé ọjọ́ iwájú gbọ́dọ̀ mọ̀",
  },
  "review.editRemoderated": {
    en: "An edit sends the review back for a quick check, so it comes off the property page until it is approved again.",
    pcm: "If you change am, e go go back for check, so e go comot from the property page till dem approve am again.",
    yo: "Ìṣàtúnṣe yóò dá àtúnyẹ̀wò padà fún àyẹ̀wò kíákíá, nítorí náà yóò kúrò ní ojú-ìwé ilé títí a ó fi fọwọ́ sí i lẹ́ẹ̀kansi.",
  },
  "review.deleteConfirm": {
    en: "Withdraw this review? It will be removed from the property page and cannot be restored.",
    pcm: "You wan comot this review? E go comot from the property page and we no fit bring am back.",
    yo: "Ṣé kí a yọ àtúnyẹ̀wò yìí kúrò? Yóò kúrò ní ojú-ìwé ilé, a kò sì lè dá a padà.",
  },
  "review.editedNote": {
    en: "Edited after posting",
    pcm: "Dem change am after e post",
    yo: "A ṣàtúnṣe rẹ̀ lẹ́yìn ìfiránṣẹ́",
  },

  // --- Account -------------------------------------------------------------
  "account.title": {
    en: "Account", pcm: "Account", yo: "Àkántì",
  },
  "account.phoneNumber": {
    en: "Phone number", pcm: "Phone number", yo: "Nọ́mbà fóònù",
  },
  "account.phoneWhy": {
    en: "Your number is how we know this account is yours. Change it here before you stop using the old one — otherwise your reviews go with it.",
    pcm: "Na your number we take sabi say na your account. Change am here before you stop to use the old one — if not, your reviews go follow am go.",
    yo: "Nọ́mbà rẹ ni a fi mọ̀ pé àkántì yìí jẹ́ tìrẹ. Yí i padà níbí kí o tó dá lílo èyí àtijọ́ dúró — bí bẹ́ẹ̀ kọ́, àwọn àtúnyẹ̀wò rẹ yóò bá a lọ.",
  },
  "account.newPhonePlaceholder": {
    en: "New number, e.g. 08055512345", pcm: "New number, e.g. 08055512345", yo: "Nọ́mbà tuntun, àpẹẹrẹ 08055512345",
  },
  "account.sendCode": {
    en: "Send code", pcm: "Send code", yo: "Fi kóòdù ránṣẹ́",
  },
  "account.codePlaceholder": {
    en: "6-digit code", pcm: "6-digit code", yo: "Kóòdù oní nọ́mbà mẹ́fà",
  },
  "account.confirm": {
    en: "Confirm", pcm: "Confirm", yo: "Ìfìdíjẹ́",
  },
  "account.phoneChanged": {
    en: "Done — this account now uses the number ending {last4}.",
    pcm: "E don work — this account dey use the number wey end for {last4} now.",
    yo: "Ó ti parí — àkántì yìí ń lo nọ́mbà tí ó parí ní {last4}.",
  },
  "account.yourData": {
    en: "Your data", pcm: "Your data", yo: "Dátà rẹ",
  },
  "account.ndprRights": {
    en: "Under the NDPR you can take a copy of everything we hold about you, or close your account.",
    pcm: "Under NDPR, you fit collect copy of everything we get about you, or close your account.",
    yo: "Lábẹ́ NDPR o lè gba ẹ̀dà gbogbo ohun tí a ní nípa rẹ, tàbí kí o pa àkántì rẹ dé.",
  },
  "account.download": {
    en: "Download my data", pcm: "Download my data", yo: "Ṣe àgbàsílẹ̀ dátà mi",
  },
  "account.delete": {
    en: "Close account", pcm: "Close account", yo: "Pa àkántì dé",
  },
  "account.deleteConfirm": {
    en: "Close this account? You will be signed out and cannot sign back in with this number. Your published reviews stay up, no longer linked to you.",
    pcm: "You wan close this account? We go sign you out and you no fit sign in again with this number. Your reviews wey don publish go still dey, but e no go carry your name again.",
    yo: "Ṣé kí a pa àkántì yìí dé? A ó ṣí ọ jáde, o kò sì lè wọlé pẹ̀lú nọ́mbà yìí mọ́. Àwọn àtúnyẹ̀wò rẹ tí a ti tẹ̀ jáde yóò wà, ṣùgbọ́n kì yóò so mọ́ ọ mọ́.",
  },
  "account.deleteNote": {
    en: "Reviews you have published stay online, detached from your account. A platform whose record can be emptied on demand is one a landlord can pressure a tenant into emptying.",
    pcm: "Reviews wey you don publish go still dey online, but e no go carry your account again. If person fit clear everything anytime, landlord fit force tenant to clear am.",
    yo: "Àwọn àtúnyẹ̀wò tí o ti tẹ̀ jáde yóò wà lórí ayélujára, láìso mọ́ àkántì rẹ. Pẹpẹ tí a lè pa àkọsílẹ̀ rẹ̀ rẹ́ nígbàkúgbà jẹ́ èyí tí onílé lè fi rọ ayálégbé láti pa á rẹ́.",
  },
  "account.genericError": {
    en: "That didn't work. Try again in a moment.",
    pcm: "E no work. Try am again small time.",
    yo: "Kò ṣiṣẹ́. Gbìyànjú lẹ́ẹ̀kansi.",
  },
  "property.approxLocation": {
    en: "Approximate location",
    pcm: "Location no dey exact",
    yo: "Ipò tí ó sún mọ́",
  },
  "property.approxLocationWhy": {
    en: "This street isn't on the map yet, so the pin shows the area, not the building. The address is as the tenant wrote it.",
    pcm: "Dem never put this street for map, so the pin dey show the area, no be the building. The address na as the tenant write am.",
    yo: "A kò tíì fi òpópónà yìí sí máàpù, nítorí náà pinnu ń fi agbègbè hàn, kì í ṣe ilé náà. Àdírẹ́sì náà wà bí ayálégbé ṣe kọ ọ́.",
  },
  // Street-level mapping in Lagos is patchy, so most real addresses only match
  // at the area. Saying so plainly is better than a silent wrong pin.
  "wizard.addressApproxStreet": {
    en: "We found the street but not the number. Pick it and we'll keep the address you typed.",
    pcm: "We see the street but no be the number. Pick am, we go keep wetin you type.",
    yo: "A rí òpópónà náà ṣùgbọ́n kì í ṣe nọ́mbà rẹ̀. Yàn án, a ó pa àdírẹ́sì tí o kọ mọ́.",
  },
  "wizard.addressApproxArea": {
    en: "That street isn't mapped yet, so this pin is the area, not your building. Your typed address is saved as you wrote it.",
    pcm: "Dem never map that street, so this pin na the area, no be your building. We go save the address as you type am.",
    yo: "A kò tíì ya òpópónà yẹn sí máàpù, nítorí náà pinnu yìí jẹ́ agbègbè, kì í ṣe ilé rẹ. A ó fi àdírẹ́sì rẹ pamọ́ bí o ṣe kọ ọ́.",
  },
  "wizard.addressAmbiguous": {
    en: "Several buildings sit at that point — pick one from the list above.",
    pcm: "Plenty buildings dey that spot — pick one for the list up there.",
    yo: "Àwọn ilé púpọ̀ wà ní ibẹ̀ — yan ọ̀kan lára àtòjọ tó wà lókè.",
  },
  "wizard.addressFailed": {
    en: "Couldn't register that address. Try again in a moment.",
    pcm: "We no fit register that address. Try am again small time.",
    yo: "A kò lè forúkọ àdírẹ́sì yẹn sílẹ̀. Gbìyànjú lẹ́ẹ̀kansi.",
  },
  "wizard.draftSaved": { en: "Draft saved", pcm: "We don keep am", yo: "A ti fi pamọ́" },
  "wizard.submitting": { en: "Submitting…", pcm: "E dey send…", yo: "Ó ń fi ránṣẹ́…" },
  "wizard.blockProperty": {
    en: "Choose the property you're reviewing.",
    pcm: "Pick the house wey you wan talk about.",
    yo: "Yan ilé tí o ń ṣe àgbéyẹ̀wò rẹ̀.",
  },
  "wizard.blockRent": {
    en: "Enter the annual rent you paid.",
    pcm: "Enter the yearly rent wey you pay.",
    yo: "Tẹ owó ilé ọdọọdún tí o san.",
  },
  "wizard.blockRatings": {
    en: "Rate every category — {n} to go.",
    pcm: "Score every category — {n} remain.",
    yo: "Fún gbogbo ẹ̀ka ní àmì — {n} ṣẹ́kù.",
  },
  "wizard.blockStory": {
    en: "Tell future tenants something — fill in at least one box.",
    pcm: "Talk something for the next tenant — fill at least one box.",
    yo: "Sọ nǹkan fún àwọn ayálegbé tó ń bọ̀ — kún ó kéré tán àpótí kan.",
  },
  "error.commute": {
    en: "Commute data didn't load. Check your connection and try again.",
    pcm: "The commute data no load. Check your network make you try again.",
    yo: "Àwọn àlàyé ìrìnàjò kò gbé wọlé. Yẹ ìsopọ̀ rẹ wò kí o sì gbìyànjú lẹ́ẹ̀kansi.",
  },
  "error.alerts": {
    en: "Recent activity didn't load. Check your connection and try again.",
    pcm: "The recent activity no load. Check your network make you try again.",
    yo: "Ìṣẹ̀lẹ̀ tuntun kò gbé wọlé. Yẹ ìsopọ̀ rẹ wò kí o sì gbìyànjú lẹ́ẹ̀kansi.",
  },
  "commute.noReportsTitle": {
    en: "No commute reports yet",
    pcm: "Nobody don talk about this road yet",
    yo: "Kò sí ìjábọ̀ ìrìnàjò síbẹ̀",
  },
  "commute.noReportsBody": {
    en: "No tenant here has reported this trip to {dest} yet. Review this property to add yours.",
    pcm: "No tenant for here don report this trip go {dest}. Drop your tori make you add yours.",
    yo: "Kò sí ayálegbé níbí tí ó ti jábọ̀ ìrìnàjò yìí sí {dest}. Ṣe àgbéyẹ̀wò láti fi tirẹ kún un.",
  },
  "alerts.title": { en: "Recent activity", pcm: "Wetin dey happen", yo: "Ìṣẹ̀lẹ̀ tuntun" },
  "alerts.subtitle": {
    en: "New reviews, flood reports and agent flags across Lagos.",
    pcm: "New tori, flood report and agent wahala for Lagos.",
    yo: "Àwọn àgbéyẹ̀wò tuntun, ìjábọ̀ ìkún omi àti ìkìlọ̀ aṣojú ní Èkó.",
  },
  "alerts.watching": { en: "Areas you watch", pcm: "Areas wey you dey follow", yo: "Àwọn agbègbè tí o ń tọ́jú" },
  "alerts.watchNone": {
    en: "Watch an area and this feed narrows to it.",
    pcm: "Follow one area, this feed go focus for am.",
    yo: "Tọ́jú àgbègbè kan, ìfilọ̀ yìí yóò sì dín kù sí i.",
  },
  "alerts.watchAdd": { en: "Watch an area", pcm: "Follow area", yo: "Tọ́jú àgbègbè" },
  "alerts.scopeWatched": { en: "My areas", pcm: "My areas", yo: "Àwọn agbègbè mi" },
  "alerts.scopeAll": { en: "All Lagos", pcm: "All Lagos", yo: "Gbogbo Èkó" },
  "alerts.emptyWatched": {
    en: "Nothing new in the areas you watch yet.",
    pcm: "Nothing new for the areas wey you dey follow.",
    yo: "Kò sí nǹkan tuntun ní àwọn agbègbè tí o ń tọ́jú.",
  },
  "alerts.noPush": {
    en: "This is an in-app feed — RentSafe won't text or push notify you.",
    pcm: "Na inside app only — RentSafe no go text you or send push.",
    yo: "Ìfilọ̀ inú ẹ̀rọ nìkan ni — RentSafe kò ní fi ìránṣẹ́ tàbí ìtaniji ránṣẹ́ sí ọ.",
  },
  "alerts.empty": {
    en: "Nothing new yet",
    pcm: "Nothing new yet",
    yo: "Kò sí nǹkan tuntun síbẹ̀",
  },
  "alerts.emptyBody": {
    en: "Reviews and flood reports will appear here as tenants add them.",
    pcm: "Tori and flood report go show here as tenants dey add am.",
    yo: "Àwọn àgbéyẹ̀wò àti ìjábọ̀ ìkún omi yóò farahàn níbí.",
  },
  "wizard.blockPhone": {
    en: "Verify your phone number to submit.",
    pcm: "Confirm your number make you fit send am.",
    yo: "Jẹ́rìí nọ́mbà fóònù rẹ kí o lè fi ránṣẹ́.",
  },
};

interface I18nContext {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nContext>({
  lang: "en",
  setLang: () => undefined,
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === "pcm" || saved === "yo" ? saved : "en";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);

  // Keep the document language in sync, otherwise screen readers keep
  // pronouncing Yorùbá and Pidgin with English phonetics.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const entry = STRINGS[key];
      let out = entry ? (entry[lang] ?? entry.en) : key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replace(`{${k}}`, String(v));
        }
      }
      return out;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContext {
  return useContext(Ctx);
}
