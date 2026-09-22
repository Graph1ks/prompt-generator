import {
  useLayoutEffect,
  useRef,
  type ChangeEvent,
} from "react";

export interface ThemedPromptTextProps {
  readonly value: string;
  readonly className?: string;
}

export interface ThemedPromptEditorProps {
  readonly value: string;
  readonly ariaLabel: string;
  readonly hint: string;
  readonly onChange: (value: string) => void;
}

function renderPromptLine(line: string, index: number) {
  const match = line.match(/^(\s*)\[([^:\]]+)(:\s*)(.*?)(\]\s*)$/u);
  if (!match) {
    return (
      <span className="manual-themed-line" key={index}>
        <span className="prompt-value">{line || "\u00a0"}</span>
      </span>
    );
  }

  const [, leading, key, separator, value, closing] = match;
  return (
    <span className="manual-themed-line" key={index}>
      {leading}
      <span className="bracket">[</span>
      <span className="prompt-key">{key}</span>
      <span className="bracket">{separator}</span>
      <span className="prompt-value">{value}</span>
      <span className="bracket">{closing}</span>
    </span>
  );
}

export function ThemedPromptText({
  value,
  className = "",
}: ThemedPromptTextProps) {
  return (
    <div className={"manual-themed-text " + className}>
      {value.split("\n").map(renderPromptLine)}
    </div>
  );
}

export function ThemedPromptEditor({
  value,
  ariaLabel,
  hint,
  onChange,
}: ThemedPromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = Math.max(96, textarea.scrollHeight) + "px";
  }, [value]);

  function onTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.currentTarget.value);
  }

  return (
    <label className="manual-prompt-editor">
      <span className="sr-only">{ariaLabel}</span>
      <span className="manual-themed-editor">
        <span className="manual-themed-underlay" aria-hidden="true">
          {value.split("\n").map(renderPromptLine)}
        </span>
        <textarea
          ref={textareaRef}
          value={value}
          spellCheck={false}
          onChange={onTextChange}
        />
      </span>
      <small>{hint}</small>
    </label>
  );
}
