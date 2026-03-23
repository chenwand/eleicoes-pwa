import { DVT_COLORS } from './constants';

export function dvtBadge(dvt: string) {
  if (!dvt || dvt === 'Válido') return null;
  const cls = DVT_COLORS[dvt] || 'text-gray-500';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls} border-current ml-1 shrink-0`}>
      {dvt}
    </span>
  );
}

export const renderHighlightedJson = (jsonObj: unknown) => {
  const json = JSON.stringify(jsonObj, null, 2).replace(/[&<>]/g, (c) => (
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c] || c
  ));
  const highlighted = json.replace(
    /(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-blue-400';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'text-purple-400 font-semibold' : 'text-green-400 break-all whitespace-pre-wrap';
      else if (/true|false/.test(match)) cls = 'text-orange-400 font-medium';
      else if (/null/.test(match)) cls = 'text-red-400 font-medium';
      return `<span class="${cls}">${match}</span>`;
    }
  );
  return <pre className="text-xs sm:text-sm text-gray-300 font-mono" dangerouslySetInnerHTML={{ __html: highlighted }} />;
};
