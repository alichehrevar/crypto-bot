import React, {useEffect, useRef, useState} from "react";
import {addToast, Avatar, Spinner} from "@heroui/react";

import {UserResponse} from "@/types/UserType";
import {sendRequest} from "@/actions/post";

export default function AvatarInput({userStore}: { userStore: any }) {
    // Ref for the hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for the image preview URL and the file object
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    // 1. Trigger the hidden file input when the avatar is clicked
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    // 2. Handle the new file selection
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            setSelectedFile(file);
            // 3. Create a temporary URL to show the image preview
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // Function to cancel the selection
    const handleCancel = () => {
        setImagePreview(null);
        setSelectedFile(null);
        // Clean up the object URL to prevent memory leaks
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
    };

    // 4. Send the image to your API
    const handleUpload = async () => {
        if (selectedFile !== null) {
            setIsUploading(true);
            const formData = new FormData();

            // The key 'avatar' must match what your backend API expects
            formData.append('avatar', selectedFile);

            return await sendRequest(formData, '/user/avatar/update');
        }
    };

    useEffect(() => {
        handleUpload()
            .then((response: UserResponse) => {
                if (response.success) {
                    addToast({
                        title: response.message,
                        color: "success"
                    })
                    userStore.storeUser({
                        ...userStore.userData,
                        info: {
                            ...userStore.userData.info,
                            avatar: response.data.info?.avatar
                        }
                    });
                    // Reset the state after a successful upload
                    handleCancel();
                } else {
                    addToast({
                        title: response.message,
                        color: "warning"
                    })
                }
            })
            .catch(() => {
                if (selectedFile) {
                    addToast({
                        title: 'Something went wrong!',
                        description: 'Please try again later.',
                        color: "danger"
                    })
                }
            })
            .finally(() => {
                setIsUploading(false);
            });
    }, [imagePreview])

    return (
        <div className="flex flex-col items-center gap-4 relative">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/gif" // Restrict to image types
                disabled={isUploading}
                style={{display: 'none'}}
                type="file"
                onChange={handleFileChange}
            />

            <div className="overflow-hidden relative group w-[63px] h-[63px] flex items-center justify-center">
                <button
                    className="flex items-center text-small bg-black/50 rounded-full cursor-pointer justify-center opacity-0 z-10 group-hover:opacity-100 transition-opacity duration-250 absolute bottom-0 right-0 left-0 top-0 w-[55px] h-[55px] m-auto"
                    onClick={handleAvatarClick}
                >
                    Edit
                </button>
                <Avatar
                    isBordered
                    as="button"
                    className="w-[55px] h-[55px]"
                    name={userStore.userData.info?.firstName + ' ' + userStore.userData.info?.lastName}
                    size="lg" // Made it larger
                    // Show preview, then existing avatar, then default
                    src={imagePreview || process.env.API_URL + userStore.userData.info?.avatar || '/images/icons/default.svg'}
                />
            </div>
            {isUploading &&
                <div className="absolute bottom-[-30px] right-0 left-0 mx-auto flex justify-center">
                    <Spinner color="primary" size="sm" variant="wave" />
                </div>
            }
        </div>
    )
}
