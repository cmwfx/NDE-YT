import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { number: 1, name: 'Idea' },
  { number: 2, name: 'Script' },
  { number: 3, name: 'Audio' },
  { number: 4, name: 'Captions' },
  { number: 5, name: 'Sections' },
  { number: 6, name: 'Visuals' },
  { number: 7, name: 'Editing' },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2',
                  step.number < currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : step.number === currentStep
                    ? 'border-primary bg-background text-primary'
                    : 'border-muted bg-background text-muted-foreground'
                )}
              >
                {step.number < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-sm font-medium',
                  step.number === currentStep ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.name}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1',
                  step.number < currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
