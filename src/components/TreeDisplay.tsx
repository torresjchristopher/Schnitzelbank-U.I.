import React, { useMemo } from 'react';
import * as d3 from 'd3';
import type { MemoryTree } from '../types';

interface TreeDisplayProps {
  tree: MemoryTree;
  onSelectPerson: (personId: string | null) => void;
}

const TreeDisplay: React.FC<TreeDisplayProps> = ({ tree, onSelectPerson }) => {
  const nodes = useMemo(() => {
    const data = { id: 'FAMILY', name: tree.familyName, isRoot: true, children: [] as any[] };
    const buildHierarchy = (parentId: string | undefined): any[] => {
      return tree.people
        .filter(p => (parentId === 'FAMILY' ? !p.parentId : p.parentId === parentId))
        .map(p => ({
          id: p.id,
          name: p.name,
          birthYear: p.birthYear,
          children: buildHierarchy(p.id)
        }));
    };
    data.children = buildHierarchy('FAMILY');
    return d3.hierarchy(data);
  }, [tree]);

  const treeLayout = useMemo(() => {
    const root = nodes;
    const dx = 120;
    const dy = 250;
    return d3.tree().nodeSize([dx, dy])(root as any);
  }, [nodes]);

  const links = treeLayout.links().map((link, i) => {
    const path = d3.linkVertical()({
      source: [link.source.x, link.source.y] as any,
      target: [link.target.x, link.target.y] as any
    });
    return <path key={i} d={path!} fill="none" stroke="#e2e8f0" strokeWidth="2" />;
  });

  const nodeElements = treeLayout.descendants().map((node, i) => (
    <g key={i} transform={"translate(" + node.x + "," + node.y + ")"} className="cursor-pointer group">
      <circle r="6" fill={(node.data as any).isRoot ? "#4f46e5" : "#fff"} stroke="#4f46e5" strokeWidth="2" className="group-hover:scale-125 transition-transform" />
      <foreignObject x="-75" y="15" width="150" height="80" style={{ textAlign: 'center' }}>
        <div 
          onClick={() => onSelectPerson((node.data as any).id === 'FAMILY' ? null : (node.data as any).id)}
          className="text-slate-900 transition-all duration-300"
          style={{ 
            fontFamily: "'Inter', sans-serif",
            fontWeight: (node.data as any).isRoot ? '700' : '500',
            fontSize: (node.data as any).isRoot ? '14px' : '12px',
            cursor: 'pointer',
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          {(node.data as any).name}
          {!(node.data as any).isRoot && <div className="text-[10px] text-slate-500 font-medium mt-1">{(node.data as any).birthYear}</div>}
        </div>
      </foreignObject>
    </g>
  ));

  const minX = Math.min(...treeLayout.descendants().map(d => d.x)) - 150;
  const maxX = Math.max(...treeLayout.descendants().map(d => d.x)) + 150;
  const minY = -50;
  const maxY = Math.max(...treeLayout.descendants().map(d => d.y)) + 150;

  return (
    <div className="bg-white p-4 overflow-auto" style={{ maxHeight: '700px' }}>
      <svg 
        width={maxX - minX} 
        height={maxY - minY} 
        viewBox={minX + " " + minY + " " + (maxX - minX) + " " + (maxY - minY)}
        className="mx-auto"
      >
        <g transform="translate(0, 30)">
          {links}
          {nodeElements}
        </g>
      </svg>
    </div>
  );
};

export default TreeDisplay;
