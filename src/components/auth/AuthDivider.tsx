interface AuthDividerProps {
  text?: string;
}

export default function AuthDivider({ text }: AuthDividerProps) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      {text && (
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-slate-400">{text}</span>
        </div>
      )}
    </div>
  );
}