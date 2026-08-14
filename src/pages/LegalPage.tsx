import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { FadeIn } from "@/components/motion";
import { Card } from "@/components/ui/Card";

/** Terms of use and privacy policy.
 *
 *  These are not decoration on a review platform. RentSafe hosts statements
 *  about named landlords and named agents in a jurisdiction where defamation
 *  carries real exposure, and it processes phone numbers under the NDPR. Both
 *  facts create obligations to users that they can only act on if they are
 *  written down somewhere reachable.
 *
 *  Written to be read: short sentences, no defined-term games, and the things
 *  that actually affect someone stated first rather than buried in clause 14.
 *
 *  NOT legal advice and not a substitute for review by a Nigerian lawyer before
 *  launch — see the note rendered at the foot of each document.
 */

type Section = { heading: string; body: string[] };

const UPDATED = "14 August 2026";

const TERMS: Section[] = [
  {
    heading: "What RentSafe is",
    body: [
      "RentSafe is a place for Lagos tenants to record what living somewhere was actually like, and for future tenants to read that before they sign a lease.",
      "It is not a listings site. We do not advertise properties for rent, take commission, or act as an agent. If you found a flat elsewhere, RentSafe is where you check it out.",
    ],
  },
  {
    heading: "Who can write a review",
    body: [
      "Only someone who has lived at the address. You verify a phone number before a review is published, and you tell us when your tenancy started and ended.",
      "One review per tenancy. Do not write about a property you have not lived in, and do not write on someone else's behalf.",
    ],
  },
  {
    heading: "What you may write — and what you may not",
    body: [
      "Write what happened to you. Rent you actually paid, repairs that were or were not done, whether the compound floods, how the agent behaved.",
      "Do not state as fact anything you do not know to be true. In Nigeria, a false statement of fact that damages someone's reputation can expose you — the author — to a defamation claim, and RentSafe cannot defend a claim on your behalf.",
      "Opinion clearly expressed as opinion is different from an assertion of fact, and safer. “The landlord refused three written requests to fix the generator” is a fact you can stand behind. “The landlord is a fraud” is an accusation.",
      "No personal data about other people: no phone numbers, no home addresses of individuals, no photographs of neighbours, no accusations of a crime.",
    ],
  },
  {
    heading: "Moderation",
    body: [
      "Reviews are checked before they appear. Some are held automatically for a human to read, usually because of language that reads as an accusation.",
      "If a review is rejected or sent back for edits, you are told why. That reason appears on your profile next to the review.",
      "We may remove a review that breaks these terms. We do not remove a review because the landlord or agent asked us to and did not like it.",
    ],
  },
  {
    heading: "Right of reply",
    body: [
      "A landlord or agent named in a published review can respond to it, once, and the response appears beside the review.",
      "Responses are moderated on the same terms as reviews. A right of reply is not a right to threaten the tenant who wrote it.",
    ],
  },
  {
    heading: "Accuracy",
    body: [
      "Reviews are individual accounts, not verified findings of fact. Flood-risk banding, elevation and area boundaries come from public open data and are approximations.",
      "Where we do not know something, we say so rather than estimating. A property with no reviews shows no score, not a zero.",
      "Some addresses are not mapped in OpenStreetMap. Where that is the case the pin is the neighbourhood, not the building, and the page says so.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "Your phone number is your account. Change it in Profile before you stop using it — we cannot restore access to a number you no longer control.",
      "You can close your account at any time. Published reviews stay online, detached from you.",
    ],
  },
];

const PRIVACY: Section[] = [
  {
    heading: "The short version",
    body: [
      "We hold your phone number only as a one-way hash, so we cannot read it back. We keep your reviews, the properties you save, and the areas you watch.",
      "We do not sell anything to anyone. We do not run advertising. There is no third-party tracker on this site.",
    ],
  },
  {
    heading: "Your phone number",
    body: [
      "We never store your phone number in a readable form. What we store is a PBKDF2 hash of it, salted with a secret held separately from everything else.",
      "This matters practically: if our database were ever taken, your number could not be read out of it. It also means we genuinely cannot tell you what your own number is — only whether a number you type matches.",
      "We keep the last four digits so you can recognise your own account.",
    ],
  },
  {
    heading: "What else we hold",
    body: [
      "Your reviews, including ones still in moderation and ones that were rejected.",
      "Photos you upload. Location metadata is stripped from every image before it is stored — an EXIF GPS tag would otherwise pinpoint where you stood.",
      "Saved properties, watched areas, commute reports, and when you were last active.",
    ],
  },
  {
    heading: "Anonymity",
    body: [
      "You can post a review under a display name rather than your own. This hides you from other users, not from us — we can still connect a review to the account that wrote it, and a court order could compel that.",
      "Do not treat anonymity here as protection against someone who already knows which flat you lived in. A review naming your unit and your tenancy dates identifies you to your landlord whatever name is on it.",
    ],
  },
  {
    heading: "Your rights under the NDPR",
    body: [
      "You have the right to see everything we hold about you. Profile → Account → Download my data gives you it as a file, immediately, with no request to approve.",
      "You have the right to have your data erased. Profile → Account → Close account does this.",
      "One deliberate limit: closing your account detaches your published reviews from you but does not delete them. A platform whose record can be emptied on demand is one a landlord can pressure a tenant into emptying. If you need a specific review taken down, contact us and say why.",
    ],
  },
  {
    heading: "Logs and security",
    body: [
      "Our server logs record which pages were requested, when, and whether they worked. They deliberately exclude search terms and review text, because a search term here is often someone's home address.",
      "Crash reports exclude user content entirely.",
    ],
  },
  {
    heading: "Who else sees your data",
    body: [
      "Our SMS provider sees your phone number in order to deliver a sign-in code. That is unavoidable and is the only place your number exists in readable form.",
      "Address lookups go to OpenStreetMap's Nominatim service, which sees the address text you type.",
      "Nobody else. No analytics, no advertising, no data brokers.",
    ],
  },
];

export default function LegalPage() {
  const { doc } = useParams<{ doc: string }>();
  const privacy = doc === "privacy";
  const sections = privacy ? PRIVACY : TERMS;
  const title = privacy ? "Privacy policy" : "Terms of use";

  return (
    <div className="space-y-3">
      <FadeIn>
        <div className="-mx-4 -mt-4 bg-ink px-4 py-5 text-white md:mx-0 md:mt-0 md:rounded-2xl">
          <Link
            to="/profile"
            className="mb-3 inline-flex items-center gap-1.5 text-2xs font-700 text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft size={13} /> Back to profile
          </Link>
          <h1 className="font-display text-xl font-800">{title}</h1>
          <p className="mt-1 text-2xs text-white/55">Last updated {UPDATED}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <Card>
          <div className="flex gap-2">
            <Link
              to="/legal/terms"
              className={`rounded-lg px-3 py-1.5 text-2xs font-700 transition-colors ${
                privacy ? "text-subtle hover:text-foreground" : "bg-aqua-soft text-primary"
              }`}
            >
              Terms of use
            </Link>
            <Link
              to="/legal/privacy"
              className={`rounded-lg px-3 py-1.5 text-2xs font-700 transition-colors ${
                privacy ? "bg-aqua-soft text-primary" : "text-subtle hover:text-foreground"
              }`}
            >
              Privacy policy
            </Link>
          </div>
        </Card>
      </FadeIn>

      {sections.map((section, i) => (
        <FadeIn key={section.heading} delay={0.1 + i * 0.03}>
          <Card>
            <h2 className="font-display text-sm font-700 text-heading">
              {section.heading}
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {section.body.map((para) => (
                <p key={para} className="text-xs leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}
            </div>
          </Card>
        </FadeIn>
      ))}

      <FadeIn delay={0.4}>
        <Card>
          {/* Stated on the page, not just in a code comment: a user deciding
              whether to trust this document deserves to know its status. */}
          <p className="text-2xs leading-relaxed text-subtle">
            These documents are written to be understood rather than to be
            exhaustive, and have not yet been reviewed by a Nigerian lawyer. If
            something here matters to a decision you are making, ask us and we
            will answer plainly.
          </p>
        </Card>
      </FadeIn>
    </div>
  );
}
