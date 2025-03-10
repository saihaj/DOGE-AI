'use client';

import { useWorkflow } from '@/hooks/flow/use-workflow';
import type { NodeExecutionState } from '@/lib/flow/workflow-execution-engine';
import { VisualizeTextNode } from '@/components/flow/visualize-text-node';
import type { NodeProps } from '@xyflow/react';
import { useCallback } from 'react';

export type VisualizeTextNodeController = Omit<VisualizeTextNode, 'data'> & {
  type: 'visualize-text';
  data: {
    executionState?: NodeExecutionState;
  };
};

export function VisualizeTextNodeController({
  id,
  data,
  ...props
}: NodeProps<VisualizeTextNodeController>) {
  const deleteNode = useWorkflow(state => state.deleteNode);

  const handleDeleteNode = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  return (
    <VisualizeTextNode
      id={id}
      data={{
        input: data.executionState?.targets?.input,
        status: data.executionState?.status,
      }}
      onDeleteNode={handleDeleteNode}
      {...props}
    />
  );
}
