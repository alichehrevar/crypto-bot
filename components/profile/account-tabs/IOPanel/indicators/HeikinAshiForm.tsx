import { Divider, Input } from "@heroui/react";
import { Button } from "@heroui/button";
import { FormEvent, useState } from "react";

export default function HeikinAshiForm() {

  const [formLoading, setFormLoading] = useState<boolean>(false);

  async function handleRSIFormSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormLoading(true);

    setTimeout(() => {
      setFormLoading(false);
    }, 1500)
  }

  return (
    <form className="mt-16 flex items-center w-full gap-3 flex-wrap" onSubmit={handleRSIFormSubmission}>
      <h3 className="flex w-full font-bold mb-3">Before HA</h3>
      <Input
        isRequired
        className="w-full lg:w-[49%]"
        classNames={{
          inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
        }}
        label="Smooth Length"
        name="smooth_length"
        type="text"
        variant="bordered"
      />
      <Input
        isRequired
        className="w-full lg:w-[49%]"
        classNames={{
          inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
        }}
        label="My Type"
        name="my_type"
        type="text"
        variant="bordered"
      />
      <Divider className="w-[80%] mx-auto my-8" />
      <h3 className="flex w-full font-bold mb-3">After HA</h3>
      <Input
        isRequired
        className="w-full lg:w-[49%]"
        classNames={{
          inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
        }}
        label="Smooth Length"
        name="smooth_length"
        type="text"
        variant="bordered"
      />
      <Input
        isRequired
        className="w-full lg:w-[49%]"
        classNames={{
          inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
        }}
        label="My Type"
        name="my_type"
        type="text"
        variant="bordered"
      />
      <Divider className="w-[80%] mx-auto my-8" />
      <h3 className="flex w-full font-bold mb-3">Optimization</h3>
      <Input
        isRequired
        className="w-full lg:w-[49%]"
        classNames={{
          inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
        }}
        label="Grid Optimization"
        name="grid_optimization"
        type="text"
        variant="bordered"
      />
      <Input
        isRequired
        className="w-full lg:w-[49%]"
        classNames={{
          inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
        }}
        label="Bayesian Constant"
        name="bayesian_constant"
        type="text"
        variant="bordered"
      />
      <Input
        isRequired
        className="w-full lg:w-[49%]"
        classNames={{
          inputWrapper: 'dark:border-white border-[0.5px] backdrop-blur-sm'
        }}
        label="Artificial Constant Tune"
        name="artificial_constant_tune"
        type="text"
        variant="bordered"
      />
      <div className="flex items-center justify-end w-full mb-3">
        <Button className="min-w-[100px]" color="primary" isLoading={formLoading} type="submit" variant="ghost">
          {!formLoading && <span>Connect</span>}
        </Button>
      </div>
    </form>
  )
}
