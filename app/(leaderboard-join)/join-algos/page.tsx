import Image from 'next/image'

import JoinAlgosForm from "@/components/pre-launch/join-algos/JoinAlgosForm";

export default function JoinAlgosPage () {
    return (
        <>
            <div className="hidden lg:flex items-center justify-center fixed top-0 right-0 bottom-0 w-[500px] h-full z-50 bg-black">
                <div className="relative h-[80%] w-full">
                    <Image fill alt="Join Algos" objectFit="contain" src="/images/pre-launch/join-bg.png" />
                </div>
            </div>
            <div className="flex w-full lg:w-[calc(100%-500px)] items-center justify-center ml-0 mr-auto mt-16 px-4 lg:px-0">
                <JoinAlgosForm />
            </div>
        </>
    )
}
