import React from "react";
import Link from "next/link";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
} from "@heroui/react";

import { DcaChartIcon, GridChartIcon, TechnicalChartIcon } from "@/utils/icons";

const technicalBots = [
  {
    id: 'tech1',
    label: 'Technical Bot',
    users: 10,
    count: '300+',
    changePct: 14,
    Icon: TechnicalChartIcon,
    link: '/bots/technical'
  },
  {
    id: 'tech2',
    label: 'DCA Bot',
    users: 8,
    count: '120+',
    changePct: 7,
    Icon: DcaChartIcon,
    link: '/bots/dca'
  },
  {
    id: 'tech3',
    label: 'Grid Bot',
    users: 5,
    count: '80+',
    changePct: 4,
    Icon: GridChartIcon,
    link: '/bots/grid'
  }
]

export default function BotTypeSelectionModal ({
   children,
}: {
  children: React.ReactNode;
}) {

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      >
        { children }
      </div>
      <Modal
        backdrop="opaque"
        isDismissable={true}
        isKeyboardDismissDisabled={false}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">Select Bot Type</ModalHeader>
              <ModalBody className="pb-5">
                <div className="space-y-6 w-full">
                  {technicalBots.map((bot) => {
                    return (
                      <Link
                        key={bot.id}
                        className={`
                      flex justify-between items-center px-6 py-4 rounded-lg w-full
                      border border-white/20
                      bg-white/10 backdrop-blur-md cursor-pointer
                    `}
                        href={bot.link}
                      >
                        <div className="space-y-1">
                          {/* title + users */}
                          <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">
                          {bot.label}
                        </span>
                            <span className="text-gray-400 text-xs flex items-center">
                          <svg
                            className="w-4 h-4 mr-1 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                              {bot.users}
                        </span>
                          </div>
                          {/* count */}
                          <div className="text-2xl font-bold text-white">
                            {bot.count}
                          </div>
                          {/* change */}
                          <div className="text-sm text-green-400">
                            ↗ +{bot.changePct}% vs previous week
                          </div>
                          {/* create link */}
                          <div className="pt-2 text-sm text-white font-medium">
                            Create →
                          </div>
                        </div>
                        <bot.Icon />
                      </Link>
                    )
                  })}
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
