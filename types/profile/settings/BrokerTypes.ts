export type BrokerConnection = {
    [key: string]: boolean,
}

export type BrokerConnectionStatus = {
    status: boolean,
    data: BrokerConnection,
    error: string
}

export type RichTextPart =
    | { type: 'text'; content: string }
    | { type: 'link'; content: string; url: string };

// Defines an individual instruction step, including optional hints.
export type InstructionStep = {
    content: string | RichTextPart[];
    hint?: string;
};

// Defines the complete structure for a broker object.
export type Broker = {
    id: string;
    name: string;
    logo: string;
    accentColor: string;
    instructions: InstructionStep[];
};
