import {topicIcons} from "@/utils/TopicIcons";

export type Lesson = {
    title: string;
    duration: string;
    description?: string;
    iconId: keyof typeof topicIcons;
}
