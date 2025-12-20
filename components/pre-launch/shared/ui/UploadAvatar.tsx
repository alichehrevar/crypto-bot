import React, {useState} from 'react';
import {Plus} from 'lucide-react';
import Image from "next/image";

// Reusable Avatar Upload Component
interface AvatarUploadProps {
    label?: string;
    onImageSelect?: (file: File) => void;
}

const UploadAvatar: React.FC<AvatarUploadProps> = ({
   label = "Optional",
   onImageSelect
}) => {
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            const objectUrl = URL.createObjectURL(file);

            setPreview(objectUrl);
            if (onImageSelect) {
                onImageSelect(file);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative group cursor-pointer">
                {/* Hidden File Input */}
                <input
                    accept="image/*"
                    aria-label="Upload avatar"
                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                    type="file"
                    onChange={handleFileChange}
                />

                {/* Main Circle Container */}
                <div className={`
                      w-24 h-24 rounded-full 
                      border-1 border-dashed 
                      flex items-center justify-center 
                      transition-colors duration-200
                      ${preview ? 'border-[#262626] bg-white' : 'border-[#262626] bg-gray-100 group-hover:bg-gray-50'}
                      overflow-hidden relative
                    `}>

                    {preview ? (
                        <Image
                            fill
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                            src={preview}
                        />
                    ) : (
                        /* Default User Icon Placeholder (Custom SVG to match the solid style) */
                        <svg
                            className="w-16 h-16 text-gray-300"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    )}
                </div>

                {/* Floating Plus Button */}
                <div className="absolute bottom-0 right-0 translate-x-1 -translate-y-1 z-10">
                    <div
                        className="flex items-center justify-center bg-gray-900 text-white rounded-full w-7 h-7 shadow-sm border-2 border-white group-hover:scale-105 transition-transform duration-200">
                        <Plus size={16} strokeWidth={2.5}/>
                    </div>
                </div>
            </div>

            {/* Label Text */}
            <span className="mt-3 text-gray-400 text-sm font-medium">
                {label}
            </span>
        </div>
    );
};

export default UploadAvatar;
