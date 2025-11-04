import React from 'react';

import {InstructionStep} from "@/types/profile/settings/BrokerTypes";

interface BrokerInstructionsProps {
    instructions: InstructionStep[];
}

const BrokerInstructions: React.FC<BrokerInstructionsProps> = ({ instructions }) => {
    return (
        <section className="w-full max-w-md">
            <h2 className='text-lg mb-4 font-semibold text-gray-300'>Connection Steps</h2>
            <div className="space-y-3">
                {instructions.map((step, index) => (
                    <div key={index}>
                        <div className="flex items-start text-sm">
                            <span className="text-gray-400 font-medium mr-3">{index + 1}.</span>
                            <p className='text-gray-400 leading-relaxed backdrop-blur-[2px]'>
                                {Array.isArray(step.content) ? (
                                    step.content.map((part, partIndex) =>
                                        part.type === 'link' ? (
                                            <a key={partIndex} className="text-blue-400 hover:underline" href={part.url} rel="noopener noreferrer" target="_blank">
                                                {part.content}
                                            </a>
                                        ) : (
                                            <span key={partIndex}>{part.content}</span>
                                        )
                                    )
                                ) : (
                                    step.content
                                )}
                            </p>
                        </div>
                        {step.hint && (
                            <div className="flex items-start text-sm ml-8 mt-1 pl-1">
                                <span className="text-gray-500 mr-2">•</span>
                                <p className="text-gray-500 font-medium">{step.hint}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

export default BrokerInstructions;
