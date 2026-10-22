import { useEffect, useState } from "react";
import PortalModal from "./PortalModal";
import { Button } from "./Button";

type DurationParts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const emptyParts: DurationParts = { days: "", hours: "", minutes: "", seconds: "" };

const getDurationParts = (value: number): DurationParts => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: days ? String(days) : "",
    hours: hours ? String(hours) : "",
    minutes: minutes ? String(minutes) : "",
    seconds: seconds ? String(seconds) : "",
  };
};

export const formatDuration = (value: number) => {
  const { days, hours, minutes, seconds } = getDurationParts(value);
  const parts = [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`, seconds && `${seconds}s`].filter(
    Boolean,
  );

  return parts.join(" ") || "0s";
};

const toSeconds = ({ days, hours, minutes, seconds }: DurationParts) =>
  (Number(days) || 0) * 86400 + (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

export const DurationInput = ({
  value,
  onChange,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [parts, setParts] = useState<DurationParts>(emptyParts);

  useEffect(() => {
    if (isOpen) setParts(getDurationParts(value));
  }, [isOpen, value]);

  const updatePart = (part: keyof DurationParts, nextValue: string) => {
    if (!/^\d*$/.test(nextValue)) return;
    const nextParts = { ...parts, [part]: nextValue };
    setParts(nextParts);
  };

  const closeModal = () => {
    const totalSeconds = toSeconds(parts);
    onChange(totalSeconds);
    setParts(getDurationParts(totalSeconds));
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`basicInput ${className}`}
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "0 0.7em",
          width: "max-content",
          flexShrink: 0,
          whiteSpace: "nowrap",
          fontSize: "0.9em",
        }}
        onClick={() => setIsOpen(true)}
      >
        {formatDuration(value)}
      </button>
      <PortalModal showModal={isOpen} handleCloseCB={closeModal} drawerStyle={{ maxWidth: "26em" }}>
        <div className="px-4 py-3">
          <div className="flex justify-center gap-2">
            {(["days", "hours", "minutes", "seconds"] as const).map((part) => (
              <label key={part} className="flex w-[6em] flex-col items-center text-center text-xs">
                <input
                  autoFocus={part === "days"}
                  className="basicInput w-full text-center"
                  style={{ minHeight: "2em", maxWidth: "6em", padding: "0em 0.2em", fontSize: "1.3em" }}
                  inputMode="numeric"
                  min="0"
                  type="number"
                  value={parts[part]}
                  onChange={(event) => updatePart(part, event.target.value)}
                />
                <span className="mt-1 block">
                  {part === "days" ? "days" : part === "hours" ? "hours" : part === "minutes" ? "min" : "sec"}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-center">
            <Button
              color="#617385"
              style={{
                fontSize: "1em",
                minWidth: "5.5em",
                height: "2.5em",
                maxHeight: "none",
                padding: "0 1em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
              onClick={closeModal}
            >
              Done
            </Button>
          </div>
        </div>
      </PortalModal>
    </>
  );
};
