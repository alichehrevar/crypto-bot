import React from "react";

export interface BotConfigFormProps {
  id: string;
  title: string;
}

export default function LabelTag ({ id, title }: BotConfigFormProps) {
  return (
    <label className="font-bold text-sm" htmlFor={id}>{ title }</label>
  )
}
