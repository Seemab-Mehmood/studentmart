export default function Badge({ children, tone = "navy" }) {
  const tones = {
    navy: "bg-[#1F3A5C] text-[#EDE7DA]",
    amber: "bg-[#D9A441] text-[#16283F]",
    outline: "border border-[#1F3A5C]/30 text-[#1F3A5C] bg-transparent",
    green: "bg-[#3F8C5F] text-white",
    red: "bg-[#B44B3F] text-white",
    gray: "bg-[#DED5BE] text-[#5B6472]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}
