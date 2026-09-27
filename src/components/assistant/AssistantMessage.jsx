import React from 'react';
import ReactMarkdown from 'react-markdown';
import AssistantToolCall from '@/components/assistant/AssistantToolCall';
import { visibleUserText } from '@/lib/assistantContext';

const MARKDOWN = {
  p: (props) => <p className="my-1.5 leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-1.5 list-disc space-y-1 pl-4" {...props} />,
  ol: (props) => <ol className="my-1.5 list-decimal space-y-1 pl-4" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
  a: (props) => <a className="underline" target="_blank" rel="noreferrer" {...props} />,
};

export default function AssistantMessage({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-line rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {visibleUserText(message.content)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-1">
        {message.content && (
          <div className="rounded-2xl border border-border bg-card px-3.5 py-2 text-sm">
            <ReactMarkdown components={MARKDOWN}>{message.content}</ReactMarkdown>
          </div>
        )}
        {message.tool_calls?.map((toolCall, index) => (
          <AssistantToolCall key={index} toolCall={toolCall} />
        ))}
      </div>
    </div>
  );
}