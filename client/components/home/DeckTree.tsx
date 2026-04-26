import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { TreeNode } from '@/lib/types';
import { AnimatedCollapsible } from '@/components/AnimatedCollapsible';
import { getCollapsedNodes, setCollapsedNodes } from '@/lib/storage';
import { Icon } from '@/components/Icon';
import { DueIndicator } from '@/components/home/DueIndicator';
import { useColors } from '@/constants/theme';

interface DeckTreeProps {
  tree: TreeNode[];
  onStudy: (node: TreeNode) => void;
  onEdit: (node: TreeNode) => void;
}

export function DeckTree({ tree, onStudy, onEdit }: DeckTreeProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCollapsedNodes().then(ids => {
      setCollapsedIds(ids);
      setLoaded(true);
    });
  }, []);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setCollapsedNodes(next);
      return next;
    });
  }, []);

  if (tree.length === 0) {
    return (
      <View className="items-center py-16 px-8">
        <Text className="text-foreground-secondary text-base text-center leading-6">
          No decks yet.{'\n'}Use New Deck or + to create your first deck.
        </Text>
      </View>
    );
  }

  if (!loaded) return null;

  return (
    <View>
      {tree.map(node => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          collapsedIds={collapsedIds}
          onToggle={toggleCollapsed}
          onStudy={onStudy}
          onEdit={onEdit}
        />
      ))}
    </View>
  );
}

// ─── Tree row ─────────────────────────────────────────────────────────────────

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onStudy: (node: TreeNode) => void;
  onEdit: (node: TreeNode) => void;
}

function TreeRow({ node, depth, collapsedIds, onToggle, onStudy, onEdit }: TreeRowProps) {
  const isCollection = node.deck === null;
  const expanded = !collapsedIds.has(node.id);
  const colors = useColors();

  return (
    <View>
      <View className="flex-row items-center" style={{ paddingLeft: depth * 20 }}>
        {/* Chevron / bullet */}
        {isCollection ? (
          <TouchableOpacity onPress={() => onToggle(node.id)} className="w-8 h-10 items-center justify-center">
            <Icon
              name={expanded ? 'chevron-down' : 'chevron-right'}
              size={14}
              color={colors.foreground_secondary}
            />
          </TouchableOpacity>
        ) : (
          <View className="w-8 h-10 items-center justify-center">
            <Icon name="bullet" size={9} color={colors.foreground_secondary} />
          </View>
        )}

        {/* Name — tappable to study */}
        <TouchableOpacity
          className="flex-1 h-10 justify-center"
          onPress={() => onStudy(node)}
          activeOpacity={0.6}
        >
          <Text
            className={`text-foreground text-base ${isCollection ? 'font-semibold' : ''}`}
            numberOfLines={1}
          >
            {node.name}
          </Text>
        </TouchableOpacity>

        {/* Status badge + due indicator (deck rows only) */}
        {!isCollection && <StatusBadge status={node.deck!.explanationStatus} />}
        {!isCollection && node.deck?.dueAt != null && <DueIndicator dueAt={node.deck.dueAt} />}

        {/* Edit button */}
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center"
          onPress={() => onEdit(node)}
          activeOpacity={0.6}
        >
          <Icon name="pencil" size={16} color={colors.foreground_secondary} />
        </TouchableOpacity>
      </View>

      {/* Children */}
      {isCollection && (
        <AnimatedCollapsible expanded={expanded} keepMounted={false}>
          <View>
            {node.children.map(child => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                collapsedIds={collapsedIds}
                onToggle={onToggle}
                onStudy={onStudy}
                onEdit={onEdit}
              />
            ))}
          </View>
        </AnimatedCollapsible>
      )}
    </View>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  switch (status) {
    case 'ready':
      return <Icon name="check" size={12} color={colors.success} />;
    case 'generating':
      return <Icon name="hourglass" size={12} color={colors.warning} />;
    case 'error':
      return <Icon name="warning" size={12} color={colors.error} />;
    case 'pending':
      return <Text className="text-foreground-secondary text-xs">…</Text>;
    default:
      return null;
  }
}
