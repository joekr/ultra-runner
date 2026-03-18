import { Button } from "./Button";

interface EventChoice {
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface EventModalProps {
  event: {
    name: string;
    description: string;
    choices: EventChoice[] | null;
  };
  onChoice: (index: number) => void;
}

export function EventModal({ event, onChoice }: EventModalProps) {
  return (
    <div class="modal-overlay">
      <div class="modal-content">
        <h3 class="modal-content__title">{event.name}</h3>
        <p class="modal-content__description">{event.description}</p>
        {event.choices && event.choices.length > 0 ? (
          <div class="modal-content__choices">
            {event.choices.map((choice, i) => (
              <div key={i}>
                <Button
                  label={choice.disabled ? `${choice.label} ${choice.disabledReason ?? "(no items)"}` : choice.label}
                  onClick={() => onChoice(i)}
                  variant={i === 0 ? "primary" : "secondary"}
                  disabled={choice.disabled}
                />
              </div>
            ))}
          </div>
        ) : (
          <Button label="Continue" onClick={() => onChoice(0)} />
        )}
      </div>
    </div>
  );
}
