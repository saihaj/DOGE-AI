import { CARD_WIDTH, MARGIN, PostType } from "./data";

export const Post = ({ imgUrl, tag, title, description }: PostType) => {
  return (
    <div
      className="group relative shrink-0 cursor-pointer"
      style={{
        width: CARD_WIDTH,
        marginRight: MARGIN,
      }}
    >
      <img
        src={imgUrl}
        className="mb-3 h-[200px] w-full rounded-md border-2 border-zinc-900 bg-zinc-300 object-cover shadow-[0px_6px_0px_rgb(24,_24,_27)] transition-all hover:translate-y-1.5 hover:shadow-[0px_0px_0px_rgb(24,_24,_27)]"
        alt={`An image for a fake blog post titled ${title}`}
      />
      <span className="rounded-md border border-zinc-900 bg-white px-1.5 py-1 text-xs">
        {tag}
      </span>
      <p className="mt-1.5 text-lg font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
};
