import SubmitAlgosButton from "@/components/pre-launch/SubmitAlgosButton";

export default function JoinCommunity({className}: {className?: string}) {
    return (
        <div className={`h-[180px] relative min-w-96 w-full max-w-[1000px] rounded-[24px] bg-[url(/images/pre-launch/join-community.jpg)] bg-center bg-cover flex items-center justify-center flex-col gap-8 px-10 ${className}`}>
            <h4 className="text-2xl lg:text-3xl font-bold">Be part of the AI trading community.</h4>
            <SubmitAlgosButton />
        </div>
    )
}
