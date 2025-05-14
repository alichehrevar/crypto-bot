'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Tabs,
  Tab
} from "@heroui/react";
import React from "react";

import DefaultDeployBotForm from "@/components/profile/bots/deploy/BotConfigForm";


export default function DeployBotModal ({
  children,
  onSuccessAction
}: {
  children: React.ReactNode;
  onSuccessAction: () => void
}) {

  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  function closeModal() {
    onOpenChange()
    onSuccessAction()
  }

  const tabs = [
    { key: "default",   title: "Default"   },
    { key: "optimized", title: "Optimized" },
    { key: 'dynamic', title: 'Dynamic' }
  ] as const;

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
        backdrop={'blur'}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
        isOpen={isOpen}
        scrollBehavior={'inside'}
        onOpenChange={onOpenChange}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold mb-4">Deploy New Bot</h2>
              </ModalHeader>
              <ModalBody>
                <div className="flex w-full flex-col">
                  <Tabs
                    fullWidth
                    aria-label="Options"
                    classNames={{
                      cursor: "w-full bg-white dark:group-data-[selected=true]:bg-white",
                      tab: "h-10",
                      tabContent: "dark:group-data-[selected=true]:text-black",
                    }}
                    radius={'full'}
                  >
                    {tabs.map(({ key, title }) => (
                      <Tab key={key} title={title}>
                        <DefaultDeployBotForm mode={key} onCloseAction={closeModal} />
                      </Tab>
                    ))}
                  </Tabs>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
