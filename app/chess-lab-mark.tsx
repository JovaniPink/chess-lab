import type { ReactElement } from "react";

type ChessLabMarkProps = Readonly<{
  borderRadius: number;
}>;

export function ChessLabMark({ borderRadius }: ChessLabMarkProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius,
        backgroundColor: "#173f35",
      }}
    >
      <svg aria-hidden="true" width="78%" height="78%" viewBox="0 0 64 64">
        <path
          fill="#dff06d"
          d="M39.9 13c-8.4 0-15.4 4.9-18.2 12.2l8.2 5.3-11.6 8.2c-2.2 1.6-3.5 4.1-3.5 6.8V49h34.4v-5.2H26.1l12.8-9.1-8.4-5.5c1.7-3.8 5.2-6.3 9.4-6.3 3.5 0 6.6 1.8 8.5 4.5l7.3-5.1C52.1 16.7 46.4 13 39.9 13Z"
        />
        <circle cx="42" cy="21.2" r="2.2" fill="#173f35" />
      </svg>
    </div>
  );
}
