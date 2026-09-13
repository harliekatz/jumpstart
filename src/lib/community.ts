/**
 * The community feed.
 *
 * Every thread and reply below is written content, not generated text and not
 * scraped from anywhere. The names are invented. This is stated in the UI on
 * the forum itself, because a financial-education product showing fabricated
 * peer advice without labelling it would be the kind of thing that is fine in a
 * portfolio piece only if nobody could mistake it for real.
 *
 * Replies the learner writes are stored locally alongside these and marked as
 * theirs. Nothing leaves the browser.
 */
import type { Thread } from "./types";

const DAY = 86_400_000;

/** Dates are relative to load so the feed never looks abandoned. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

export function seedThreads(): Thread[] {
  return [
    {
      id: "th-1",
      skill: "budgeting",
      author: "Priya",
      level: 7,
      title: "Rent is 55% of my take-home. Is 50/30/20 just not for me?",
      body: "Moved for a job and housing ate the budget. Every framework I read assumes rent is half of what mine is. Do I just ignore the whole thing?",
      at: daysAgo(2),
      replies: [
        {
          id: "r-1a",
          author: "Marcus",
          level: 12,
          body: "Keep the ordering, drop the percentages. The useful part of 50/30/20 is that savings is a line item before discretionary, not a leftover. Mine is closer to 65/20/15 and it still works because the 15 comes out first.",
          at: daysAgo(2),
        },
        {
          id: "r-1b",
          author: "Dana",
          level: 9,
          body: "Also worth separating what is actually fixed. I found about $200 of my 'needs' was subscriptions and convenience spending I had filed under essentials because it was on autopay.",
          at: daysAgo(1),
        },
      ],
    },
    {
      id: "th-2",
      skill: "credit",
      author: "Tomás",
      level: 5,
      title: "Score dropped 40 points and I pay in full every month",
      body: "Never missed a payment. Balance is always cleared. Score still fell. What am I missing?",
      at: daysAgo(4),
      replies: [
        {
          id: "r-2a",
          author: "Ines",
          level: 14,
          body: "Almost certainly utilisation timing. The issuer reports at statement close, not at your due date. You pay in full afterwards, so the reported balance is whatever you spent that cycle. Try paying down a few days before the statement closes and watch what reports.",
          at: daysAgo(4),
        },
        {
          id: "r-2b",
          author: "Tomás",
          level: 5,
          body: "That would explain it. Big purchase last cycle that I cleared on the due date. Thanks.",
          at: daysAgo(3),
        },
      ],
    },
    {
      id: "th-3",
      skill: "investing",
      author: "Grace",
      level: 11,
      title: "Is six tech stocks diversified if they are all different companies?",
      body: "Genuine question. They compete with each other, so surely they are not the same bet?",
      at: daysAgo(6),
      replies: [
        {
          id: "r-3a",
          author: "Noé",
          level: 16,
          body: "Competing does not help you. What matters is whether the same shock hits all of them, and sector-wide shocks — rates, chip supply, regulation — do exactly that. Six names in one sector behaves much closer to one bet than to six.",
          at: daysAgo(6),
        },
        {
          id: "r-3b",
          author: "Hélène",
          level: 8,
          body: "Try it in the simulator. Build one portfolio of six from the same sector and one spread across sectors and bonds, then step the days forward. The volatility difference is obvious well before the return difference is.",
          at: daysAgo(5),
        },
      ],
    },
    {
      id: "th-4",
      skill: "taxes",
      author: "Léo",
      level: 6,
      title: "Turned down overtime because it would push me into the next bracket",
      body: "My manager said that is not how it works and I feel stupid. Can someone explain properly?",
      at: daysAgo(8),
      replies: [
        {
          id: "r-4a",
          author: "Priya",
          level: 7,
          body: "Your manager is right, and this belief is extremely common so do not feel bad. Only the income above the threshold gets the higher rate. Everything below keeps the lower rates. More gross is always more net under ordinary income tax.",
          at: daysAgo(8),
        },
        {
          id: "r-4b",
          author: "Ines",
          level: 14,
          body: "The one real version of this concern is benefit cliffs, where a hard income limit on a subsidy or credit can mean a raise leaves you worse off. That is a genuine effect, but it is about eligibility thresholds, not brackets.",
          at: daysAgo(7),
        },
      ],
    },
    {
      id: "th-5",
      skill: "investing",
      author: "Dana",
      level: 9,
      title: "0.6% expense ratio — is that actually bad?",
      body: "It is a fund my parents recommended. Sounds like nothing to me.",
      at: daysAgo(11),
      replies: [
        {
          id: "r-5a",
          author: "Marcus",
          level: 12,
          body: "Compare it to what the same exposure costs elsewhere. If a broad index version is at 0.05%, you are paying about twelve times as much for the same thing. The annual difference looks trivial and the thirty-year difference is not.",
          at: daysAgo(11),
        },
      ],
    },
    {
      id: "th-6",
      skill: "budgeting",
      author: "Hélène",
      level: 8,
      title: "How do you actually handle irregular costs?",
      body: "Car registration, vet bills, the annual insurance premium. Every year they hit and every year I am surprised.",
      at: daysAgo(14),
      replies: [
        {
          id: "r-6a",
          author: "Grace",
          level: 11,
          body: "Add up last year's irregulars, divide by twelve, treat it as a monthly bill. One savings balance, a note of what each chunk is for. It stops being a surprise the first month you do it.",
          at: daysAgo(13),
        },
        {
          id: "r-6b",
          author: "Noé",
          level: 16,
          body: "Worth keeping it separate from the emergency fund in your head even if it sits in the same account. If the emergency fund is paying for a planned expense, it is not an emergency fund any more.",
          at: daysAgo(12),
        },
      ],
    },
  ];
}
