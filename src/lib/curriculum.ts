/**
 * Course content.
 *
 * Twenty lessons across four tracks, wired into a prerequisite DAG. The graph is
 * the reason the scheduler can say something more useful than "next in the list":
 * it knows that index funds only make sense after compounding, and that
 * tax-advantaged accounts only make sense after both.
 *
 * The financial content is general education, not advice. It deliberately avoids
 * naming products, rates that go stale, or anything jurisdiction-specific beyond
 * US federal basics.
 */
import type { Goal, Lesson, Skill, SkillId } from "./types";

export const SKILLS: Record<SkillId, Skill> = {
  budgeting: {
    id: "budgeting",
    name: "Budgeting",
    blurb: "Where the money goes, and what is left when it has gone there.",
  },
  credit: {
    id: "credit",
    name: "Credit & Debt",
    blurb: "Borrowing costs, credit scores, and the order to pay things off in.",
  },
  investing: {
    id: "investing",
    name: "Investing",
    blurb: "Compounding, diversification, and why fees matter more than they look.",
  },
  taxes: {
    id: "taxes",
    name: "Taxes",
    blurb: "Brackets, withholding, and the accounts that change your tax bill.",
  },
};

export const GOALS: Goal[] = [
  {
    id: "emergency-fund",
    name: "Build an emergency fund",
    blurb: "Get to a cushion that covers a few months without income.",
    weights: { budgeting: 1, credit: 0.5, investing: 0.3, taxes: 0.2 },
  },
  {
    id: "pay-off-debt",
    name: "Pay off debt",
    blurb: "Understand what the debt actually costs and which to kill first.",
    weights: { budgeting: 0.8, credit: 1, investing: 0.2, taxes: 0.3 },
  },
  {
    id: "start-investing",
    name: "Start investing",
    blurb: "Put money to work without taking risks you have not priced.",
    weights: { budgeting: 0.5, credit: 0.3, investing: 1, taxes: 0.7 },
  },
  {
    id: "understand-paycheck",
    name: "Understand my paycheck",
    blurb: "Read a payslip, fix your withholding, stop overpaying.",
    weights: { budgeting: 0.7, credit: 0.2, investing: 0.3, taxes: 1 },
  },
];

export const LESSONS: Lesson[] = [
  // Budgeting -------------------------------------------------------------
  {
    id: "cash-flow",
    skill: "budgeting",
    title: "Cash flow, not income",
    summary: "What you earn is not what you can spend. Start from what clears.",
    prerequisites: [],
    minutes: 4,
    sections: [
      {
        heading: "Gross, net, and available",
        body: "Gross pay is the number in the offer letter. Net pay is what lands in the account after tax withholding, insurance premiums and retirement contributions. Available cash flow is net pay minus the bills that arrive whether or not you think about them: rent, utilities, insurance, minimum debt payments, subscriptions. Only the remainder is genuinely discretionary. Most people budget against gross pay by accident and are then confused about why the month does not work.",
      },
      {
        heading: "Fixed, variable, and irregular",
        body: "Fixed costs are the same every month. Variable costs move with behavior: groceries, fuel, going out. Irregular costs are the ones that wreck budgets because they are annual or unpredictable: car registration, a dental bill, a wedding you have to fly to. The fix is to divide the annual total by twelve and treat it as a monthly line, so the money is already set aside when the bill arrives.",
        callout: "A $900 annual insurance premium is a $75 monthly line, not a surprise in March.",
      },
    ],
    items: ["b1", "b2"],
  },
  {
    id: "budget-frameworks",
    skill: "budgeting",
    title: "Frameworks, and their limits",
    summary: "50/30/20 is a starting posture, not a rule.",
    prerequisites: ["cash-flow"],
    minutes: 5,
    sections: [
      {
        heading: "The 50/30/20 split",
        body: "One common guideline puts 50 percent of net pay toward needs, 30 percent toward wants and 20 percent toward saving and extra debt payment. Its value is that it forces a savings line to exist before discretionary spending is considered, rather than treating savings as whatever survives the month.",
      },
      {
        heading: "Where it breaks",
        body: "The split assumes housing is affordable relative to income. In an expensive metro, needs alone can exceed 50 percent of net pay, and forcing the framework produces a budget that is wrong on paper every month. The useful response is to keep the ordering (savings is a bill, not a remainder) and change the proportions to something achievable, then raise the savings line as income rises rather than raising spending.",
        callout: "A framework you meet 60 percent of the time beats a stricter one you abandon in week three.",
      },
    ],
    items: ["b3", "b4"],
  },
  {
    id: "emergency-fund",
    skill: "budgeting",
    title: "Sizing an emergency fund",
    summary: "Three months of what, exactly.",
    prerequisites: ["cash-flow"],
    minutes: 4,
    sections: [
      {
        heading: "Months of expenses, not months of income",
        body: "The target is expenses, not salary. If your essential monthly outgoings are $2,400, three months is $7,200 regardless of what you earn. Sizing against income inflates the target and makes the goal feel unreachable, which is how people end up with no cushion at all.",
      },
      {
        heading: "How many months",
        body: "The right number depends on how quickly your income could be replaced. Two salaried earners in a field that hires constantly need less cushion than one freelancer with lumpy contracts. Commission and contract work, a single-income household, or a specialised role in a thin market all argue for six months or more. Somebody early in a career with low fixed costs and a family backstop can reasonably start at one month and build.",
        callout: "Essential outgoings $2,400/mo → three months = $7,200. Not three months of a $5,000 salary.",
      },
    ],
    items: ["b5", "b6"],
  },
  {
    id: "sinking-funds",
    skill: "budgeting",
    title: "Sinking funds",
    summary: "The technique that stops annual bills from becoming credit card debt.",
    prerequisites: ["budget-frameworks", "emergency-fund"],
    minutes: 3,
    sections: [
      {
        heading: "Saving toward a known date",
        body: "A sinking fund is money set aside monthly for a specific expense you already know is coming: holiday travel, a car service, an annual subscription. It is distinct from an emergency fund, which is for the things you cannot know about. Mixing them is the common mistake: when the emergency fund pays for Christmas, it is not an emergency fund.",
      },
      {
        heading: "Running several at once",
        body: "In practice you do not need separate accounts for each. One savings balance with a spreadsheet or an app tracking what each dollar is earmarked for does the same job. What matters is that the earmarked total is subtracted before you decide what is spendable.",
      },
    ],
    items: ["b7"],
  },
  {
    id: "lifestyle-creep",
    skill: "budgeting",
    title: "Lifestyle creep",
    summary: "Why a raise often produces no extra savings.",
    prerequisites: ["budget-frameworks"],
    minutes: 3,
    sections: [
      {
        heading: "Spending rises to meet income",
        body: "Each raise arrives as a small permanent increase in comfort: a better apartment, more convenience spending, a higher baseline of what feels normal. Because the adjustment is gradual, the savings rate stays flat while income doubles. The effect is not about willpower, it is that the default is spending and the exception has to be deliberate.",
      },
      {
        heading: "Pre-committing the raise",
        body: "The mechanical fix is to route a fixed share of every raise straight into savings or retirement before it reaches a spending account, so the new money never establishes a new baseline. Splitting it, half to lifestyle and half to savings, tends to survive contact with reality better than routing all of it.",
        callout: "Raise of $400/mo, half pre-committed: $200 to savings, $200 to spend. Savings rate rises instead of holding flat.",
      },
    ],
    items: ["b8"],
  },

  // Credit & debt ---------------------------------------------------------
  {
    id: "interest-basics",
    skill: "credit",
    title: "What interest actually costs",
    summary: "APR, compounding frequency, and minimum payments.",
    prerequisites: [],
    minutes: 5,
    sections: [
      {
        heading: "APR is annual, balances are daily",
        body: "A credit card quoted at 24 percent APR does not charge 24 percent once a year. It converts to a daily periodic rate, applies it to the balance each day and compounds. The effective annual cost is therefore higher than the quoted APR, which is why carrying a balance is expensive in a way the headline number understates.",
      },
      {
        heading: "Minimum payments",
        body: "A minimum payment is typically a small percentage of the balance plus accrued interest, set so that the balance declines very slowly. Paying only the minimum on a substantial balance can take over a decade and cost more in interest than the original purchases. The number that matters is not the monthly payment but the total paid over the life of the balance.",
        callout: "$4,000 at 24% APR, minimum payments only: roughly 15 years and more than $5,000 of interest.",
      },
    ],
    items: ["c1", "c2"],
  },
  {
    id: "credit-scores",
    skill: "credit",
    title: "How credit scores move",
    summary: "Five inputs, weighted unevenly.",
    prerequisites: [],
    minutes: 4,
    sections: [
      {
        heading: "The inputs",
        body: "Scoring models weight payment history most heavily, followed by amounts owed relative to limits, then length of credit history, credit mix and recent applications. Payment history and utilization together account for the large majority of the score, which means the two things worth attention are paying on time and keeping balances low relative to limits.",
      },
      {
        heading: "Utilization is a snapshot",
        body: "Utilization is measured when the issuer reports, usually at statement close, not at the due date. Somebody who spends heavily and pays in full every month can still show high utilization if the statement closes before the payment. Paying down before the statement date, rather than only by the due date, changes the reported figure.",
        callout: "Utilization = reported balance ÷ total limit. $900 on a $3,000 limit reports as 30%.",
      },
    ],
    items: ["c3", "c4"],
  },
  {
    id: "debt-payoff",
    skill: "credit",
    title: "Avalanche and snowball",
    summary: "Two orderings, one cheaper and one more likely to be finished.",
    prerequisites: ["interest-basics"],
    minutes: 4,
    sections: [
      {
        heading: "The two orderings",
        body: "The avalanche method pays minimums on everything and directs spare money at the highest interest rate first. It is arithmetically optimal: it always costs the least in total interest. The snowball method targets the smallest balance first regardless of rate, clearing individual debts faster and producing visible progress early.",
      },
      {
        heading: "Choosing between them",
        body: "Avalanche wins on cost. Snowball wins on completion rates in practice, because a plan abandoned in month four saves nothing. If the rate gap between debts is small, the difference in total interest is minor and the motivational argument dominates. If one debt is at 26 percent and another at 5 percent, the gap is large enough that avalanche is worth the patience.",
        callout: "Same debts, same payment: avalanche is never more expensive. Snowball is sometimes more finishable.",
      },
    ],
    items: ["c5", "c6"],
  },
  {
    id: "secured-vs-unsecured",
    skill: "credit",
    title: "Secured and unsecured borrowing",
    summary: "Why a mortgage is cheaper than a card.",
    prerequisites: ["interest-basics"],
    minutes: 3,
    sections: [
      {
        heading: "Collateral prices risk",
        body: "Secured debt is backed by an asset the lender can take: a mortgage by the house, an auto loan by the car. If the borrower defaults, the lender recovers most of the money, so the rate is lower. Unsecured debt, meaning credit cards, most personal loans and student loans, has no such backstop, so the rate carries the full cost of default risk.",
      },
      {
        heading: "What that means when consolidating",
        body: "Moving unsecured debt onto secured borrowing lowers the rate but converts a debt that could be discharged or negotiated into one that can cost you the asset. The lower monthly payment is real; so is the change in what happens if you cannot pay.",
      },
    ],
    items: ["c7"],
  },
  {
    id: "credit-products",
    skill: "credit",
    title: "Reading the fine print",
    summary: "Promotional rates, deferred interest, and fee structures.",
    prerequisites: ["credit-scores", "debt-payoff"],
    minutes: 4,
    sections: [
      {
        heading: "Zero percent is a period, not a rate",
        body: "A promotional zero-percent balance transfer usually carries a transfer fee of three to five percent and reverts to a standard rate at the end of the period. It is genuinely useful if the balance is cleared inside the window. If it is not, the remaining balance moves to the standard rate and the fee was paid for nothing.",
      },
      {
        heading: "Deferred interest",
        body: "Some store financing is not true zero percent but deferred interest: interest accrues from day one and is waived only if the entire balance is cleared by the deadline. Miss it by a dollar and the full accrued amount is charged retroactively. The distinction is in the terms and almost never in the advertising.",
        callout: "Deferred interest ≠ 0% APR. One waives interest if you finish; the other never charged it.",
      },
    ],
    items: ["c8"],
  },

  // Investing -------------------------------------------------------------
  {
    id: "compounding",
    skill: "investing",
    title: "Compounding",
    summary: "Why the first decade matters more than the last.",
    prerequisites: [],
    minutes: 5,
    sections: [
      {
        heading: "Growth on growth",
        body: "Compounding is return earned on prior returns as well as on the original capital. It makes outcomes non-linear in time: doubling the years invested more than doubles the result. This is the reason that the same total contributed early beats a larger total contributed late.",
      },
      {
        heading: "The cost of waiting",
        body: "Someone investing $300 a month from 25 to 35 and then stopping will often end up ahead of someone investing $300 a month from 35 to 65, despite contributing a third as much, because the early money has thirty extra years to compound. The intuition most people carry, that total contributions dominate, is wrong over long horizons.",
        callout: "At 7% nominal: $300/mo for 10 years starting at 25 outpaces $300/mo for 30 years starting at 35.",
      },
    ],
    items: ["i1", "i2"],
  },
  {
    id: "risk-return",
    skill: "investing",
    title: "Risk and return",
    summary: "Volatility is the price, not the danger.",
    prerequisites: ["compounding"],
    minutes: 5,
    sections: [
      {
        heading: "What risk means here",
        body: "In investing, risk usually refers to volatility: how much a value swings around its trend. Higher expected returns come with higher volatility, and the relationship is not a bug to be engineered away but the mechanism by which returns exist. Investors are paid for holding assets whose value bounces around.",
      },
      {
        heading: "Time horizon changes everything",
        body: "Volatility is a serious problem for money needed in two years and a manageable one for money needed in thirty. The practical question is never 'how much risk can I tolerate' in the abstract but 'when do I need this specific money'. Emergency savings and retirement savings are answering different questions and should not sit in the same instrument.",
        callout: "Money you need in 18 months does not belong in equities, whatever your risk appetite.",
      },
    ],
    items: ["i3", "i4"],
  },
  {
    id: "diversification",
    skill: "investing",
    title: "Diversification",
    summary: "The one thing that reduces risk without reducing expected return.",
    prerequisites: ["risk-return"],
    minutes: 4,
    sections: [
      {
        heading: "Uncorrelated bets",
        body: "Holding many assets whose prices do not move together reduces the volatility of the whole without lowering expected return, because the idiosyncratic swings partly cancel. This is unusual: almost every other risk reduction costs you return. It is why concentration in a single stock, however good the company, is generally an uncompensated risk.",
      },
      {
        heading: "What does not count",
        body: "Owning ten technology stocks is not diversified; they share the same sector shocks. Neither is holding several funds that all track the same index. Real diversification means variation in asset class, sector and geography, and for most people it is achieved more cheaply by a broad index fund than by picking.",
        callout: "Ten stocks in one sector behave closer to one bet than to ten.",
      },
    ],
    items: ["i5", "i6"],
  },
  {
    id: "fees",
    skill: "investing",
    title: "Fees and drag",
    summary: "A one percent fee is not a one percent difference.",
    prerequisites: ["compounding"],
    minutes: 4,
    sections: [
      {
        heading: "Fees compound too",
        body: "An expense ratio is charged on the whole balance every year, so it takes not only the fee but all future growth that fee would have produced. Over decades, the difference between a fund charging 0.05 percent and one charging 1 percent can consume a meaningful share of the final balance, even though the annual difference looks trivial.",
        callout: "Over 30 years at 7%, a 1% annual fee costs roughly a fifth of the ending balance.",
      },
      {
        heading: "The fees that hide",
        body: "Expense ratios are disclosed. Trading costs, bid-ask spreads, advisory fees layered on top of fund fees, and the tax cost of high turnover are less visible and can exceed the headline number. The question to ask about any product is the total annual cost of ownership, not the advertised rate.",
      },
    ],
    items: ["i7"],
  },
  {
    id: "index-investing",
    skill: "investing",
    title: "Index funds",
    summary: "Why the boring option is the default recommendation.",
    prerequisites: ["diversification", "fees"],
    minutes: 4,
    sections: [
      {
        heading: "Buying the market",
        body: "An index fund holds every constituent of an index in proportion, rather than selecting among them. It gets diversification in one purchase and, because there is no research operation to fund, charges very little. The combination of those two properties is the entire argument.",
      },
      {
        heading: "The evidence on active management",
        body: "Across long periods, the majority of actively managed funds underperform their benchmark after fees, and the minority that outperform are not reliably the same funds decade to decade. This does not mean skill does not exist; it means identifying it in advance, net of what it costs to hire, is the hard part.",
      },
    ],
    items: ["i8"],
  },

  // Taxes -----------------------------------------------------------------
  {
    id: "brackets",
    skill: "taxes",
    title: "Marginal versus effective",
    summary: "A raise into the next bracket never lowers your take-home.",
    prerequisites: [],
    minutes: 4,
    sections: [
      {
        heading: "Brackets are marginal",
        body: "Income tax is charged in slices. Moving into a higher bracket means only the income above that threshold is taxed at the higher rate; everything below it continues to be taxed at the lower rates. The widespread belief that a raise can leave you worse off is, for ordinary income tax, false.",
        callout: "Crossing into a 22% bracket taxes the dollars above the threshold at 22%, not your whole income.",
      },
      {
        heading: "Effective rate",
        body: "The effective rate is total tax divided by total income, and is always lower than the top marginal rate. Marginal rate is the right number for deciding what one more dollar of income or one more dollar of deduction is worth. Effective rate is the right number for describing what you actually paid. Using one where the other belongs produces most tax confusion.",
      },
    ],
    items: ["t1", "t2"],
  },
  {
    id: "withholding",
    skill: "taxes",
    title: "Withholding and refunds",
    summary: "A large refund is not a win.",
    prerequisites: ["brackets"],
    minutes: 4,
    sections: [
      {
        heading: "What withholding is",
        body: "An employer estimates your annual tax and deducts a share from each paycheck. The filing at year end reconciles the estimate against the actual liability. A refund means the estimate was too high and you overpaid through the year; a bill means it was too low.",
      },
      {
        heading: "The cost of over-withholding",
        body: "A $3,000 refund is $250 a month that was unavailable to you all year, and no interest was paid on it. For somebody carrying credit card debt at a high rate, over-withholding is straightforwardly expensive. Adjusting withholding so the year lands near zero puts that money in your hands as it is earned.",
        callout: "A $3,000 refund = roughly $250/month you lent at 0% for up to a year.",
      },
    ],
    items: ["t3", "t4"],
  },
  {
    id: "deductions-credits",
    skill: "taxes",
    title: "Deductions and credits",
    summary: "They are not the same size.",
    prerequisites: ["brackets"],
    minutes: 4,
    sections: [
      {
        heading: "Different mechanisms",
        body: "A deduction reduces taxable income, so it is worth your marginal rate: a $1,000 deduction at a 22 percent marginal rate saves $220. A credit reduces the tax itself, so a $1,000 credit saves $1,000. Credits are worth substantially more per dollar, and the difference grows as marginal rate falls.",
        callout: "$1,000 deduction at 22% → $220 saved. $1,000 credit → $1,000 saved.",
      },
      {
        heading: "Standard and itemised",
        body: "Filers take either the standard deduction or the sum of their itemised deductions, whichever is larger. Since the standard deduction was raised substantially, the large majority of filers take it, which means many commonly cited deductions have no effect on their bill at all.",
      },
    ],
    items: ["t5", "t6"],
  },
  {
    id: "tax-advantaged",
    skill: "taxes",
    title: "Tax-advantaged accounts",
    summary: "Pay tax now or pay it later, and how to choose.",
    prerequisites: ["withholding", "compounding"],
    minutes: 5,
    sections: [
      {
        heading: "Traditional and Roth",
        body: "A traditional contribution is deducted from income now and taxed on withdrawal in retirement. A Roth contribution is made from already-taxed income and withdrawn tax-free. The arithmetic hinges on one comparison: your marginal rate now versus your expected marginal rate when you withdraw.",
      },
      {
        heading: "The rule of thumb, and its exception",
        body: "Early in a career, when income and therefore marginal rate are low, Roth is usually favorable: you are paying tax at a rate you are unlikely to see again. At peak earnings, traditional is usually favorable. The exception that dominates both: an employer match is an immediate return on contribution that neither tax treatment comes close to, so contributing at least enough to capture the full match generally comes first.",
        callout: "A 50% match on the first 6% of salary is a 50% return before the market does anything.",
      },
    ],
    items: ["t7"],
  },
  {
    id: "capital-gains",
    skill: "taxes",
    title: "Capital gains",
    summary: "Holding period changes the rate.",
    prerequisites: ["deductions-credits", "risk-return"],
    minutes: 4,
    sections: [
      {
        heading: "Short and long term",
        body: "An asset sold at a profit within a year is taxed as ordinary income at your marginal rate. Held longer than a year, the gain is taxed at long-term capital gains rates, which are lower for most people. The difference is often large enough that the holding period matters more to after-tax return than a few percent of price movement.",
      },
      {
        heading: "Realisation and offsetting",
        body: "Tax is owed when a gain is realized by selling, not while it accrues on paper. Realised losses can offset realized gains, and a limited amount of net loss can offset ordinary income, with the remainder carried forward. This is the mechanism behind tax-loss harvesting, which is a real effect and also frequently oversold.",
        callout: "Sold at 11 months: ordinary income rates. Sold at 13 months: long-term rates.",
      },
    ],
    items: ["t8"],
  },
];

export const LESSONS_BY_ID: ReadonlyMap<string, Lesson> = new Map(
  LESSONS.map((lesson) => [lesson.id, lesson]),
);

export function lessonsForSkill(skill: SkillId): Lesson[] {
  return LESSONS.filter((lesson) => lesson.skill === skill);
}

/**
 * Verifies the prerequisite graph is acyclic and every edge points at a real
 * lesson. Called by a test rather than at runtime: a broken graph is a content
 * bug that should fail the build, not degrade silently for a user.
 */
export function validateGraph(lessons: Lesson[] = LESSONS): string[] {
  const problems: string[] = [];
  const ids = new Set(lessons.map((lesson) => lesson.id));

  for (const lesson of lessons) {
    for (const prerequisite of lesson.prerequisites) {
      if (!ids.has(prerequisite)) {
        problems.push(`${lesson.id} requires unknown lesson ${prerequisite}`);
      }
    }
  }

  const state = new Map<string, "visiting" | "done">();
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  const visit = (id: string, trail: string[]): void => {
    const seen = state.get(id);
    if (seen === "done") return;
    if (seen === "visiting") {
      problems.push(`cycle: ${[...trail, id].join(" -> ")}`);
      return;
    }
    state.set(id, "visiting");
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
      if (byId.has(prerequisite)) visit(prerequisite, [...trail, id]);
    }
    state.set(id, "done");
  };

  for (const lesson of lessons) visit(lesson.id, []);
  return problems;
}
