import React from "react";

export interface BotConfigFormProps {
  id: string;
  title: string;
}

export default function LabelTag ({ id, title }: BotConfigFormProps) {
  return (
    <label htmlFor={id} className="font-bold text-sm">{ title }</label>
  )
}
