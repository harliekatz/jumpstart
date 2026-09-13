/**
 * One question, used by both the diagnostic and lesson practice.
 *
 * The `reveal` prop is the difference between the two modes. Practice shows the
 * correct answer and its explanation immediately, because that is where the
 * teaching happens. The diagnostic withholds both until the end, so that
 * answering item three does not give away item four — and so the mastery model
 * can treat those twelve answers as measurement rather than instruction.
 */
import { Check, X } from "lucide-react";
import type { Item } from "@/lib/types";

export function QuestionCard({
  item,
  index,
  total,
  picked,
  reveal,
  onPick,
}: {
  item: Item;
  index: number;
  total: number;
  picked: number | null;
  reveal: boolean;
  onPick: (choice: number) => void;
}) {
  const answered = picked !== null;

  return (
    <div className="question">
      <div className="question-meta">
        <span className="eyebrow">
          Question {index + 1} of {total}
        </span>
        <span className="badge">{item.skill}</span>
      </div>

      <p className="question-prompt">{item.prompt}</p>

      <div className="answers" role="group" aria-label={item.prompt}>
        {item.choices.map((choice, choiceIndex) => {
          const isPicked = picked === choiceIndex;
          const isAnswer = item.answer === choiceIndex;

          let variant = "";
          if (reveal && answered) {
            if (isAnswer) variant = " is-correct";
            else if (isPicked) variant = " is-wrong";
          } else if (isPicked) {
            variant = " is-picked";
          }

          return (
            <button
              key={choiceIndex}
              type="button"
              className={`answer${variant}`}
              disabled={reveal && answered}
              aria-pressed={isPicked}
              onClick={() => onPick(choiceIndex)}
            >
              <span className="answer-key" aria-hidden="true">
                {reveal && answered && isAnswer ? (
                  <Check size={13} />
                ) : reveal && answered && isPicked ? (
                  <X size={13} />
                ) : (
                  String.fromCharCode(65 + choiceIndex)
                )}
              </span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>

      {reveal && answered && (
        <p className="explanation">
          <strong style={{ color: "var(--text)" }}>
            {picked === item.answer ? "Correct. " : "Not quite. "}
          </strong>
          {item.explanation}
        </p>
      )}
    </div>
  );
}
