import { studySchema } from "@/types/chess";

export const jovaniStudy = studySchema.parse({
  id: "jovani-vs-computer-2026-07-20",
  title: "Jovani Pink vs. Computer",
  headline: "One loose knight opened the road to mate.",
  summary:
    "The opening was playable. The loss came from repeated tempi, missed defender arithmetic, and two diagonals that disappeared from view.",
  expectedPlyCount: 30,
  pgn: `[Event "Training game"]
[Site "Jovani Chess Lab"]
[Date "2026.07.20"]
[White "Jovani Pink"]
[Black "Computer"]
[Result "0-1"]

1. e4 e6 2. Nf3 c5 3. d3 Nc6 4. Nc3 Nf6 5. e5 Ng4
6. Ng5 Ngxe5 7. Bf4 Be7 8. Nge4 Qc7 9. Ne2 Qb6
10. Be3 d5 11. Nxc5 d4 12. Bxd4 Nxd4 13. Nxd4 Bxc5
14. Nf3 Bxf2+ 15. Ke2 Qe3# 0-1`,
  lessons: [
    {
      id: "premature-advance",
      setupPly: 8,
      moveLabel: "5.e5?!",
      title: "A premature advance",
      severity: "inaccuracy",
      prompt:
        "White has developed only modestly. Which candidate follows the principle of developing and preparing king safety?",
      correctSan: "Be2",
      candidates: [
        {
          san: "Be2",
          correct: true,
          explanation: "Develops the bishop and prepares castling without creating a target.",
        },
        {
          san: "e5",
          correct: false,
          explanation: "Moves the e-pawn twice while the kingside pieces remain at home.",
        },
        {
          san: "h4",
          correct: false,
          explanation: "A flank pawn move does not solve White's development problem.",
        },
      ],
      hint: "Prefer a move that develops a new piece and makes castling easier.",
      insight:
        "The position was still playable, but 5.e5 spent another tempo on the same pawn while the king, f1-bishop, queen, and rooks remained undeveloped.",
    },
    {
      id: "defender-arithmetic",
      setupPly: 10,
      moveLabel: "6.Ng5?",
      title: "The first concrete oversight",
      severity: "mistake",
      prompt:
        "Black's knights on g4 and c6 attack e5. Which candidate develops with purpose and preserves the pawn's support?",
      correctSan: "Bf4",
      candidates: [
        {
          san: "Bf4",
          correct: true,
          explanation: "Develops the bishop while adding a second defender to e5.",
        },
        {
          san: "Ng5",
          correct: false,
          explanation: "Moves away the pawn's only defender and allows ...Ngxe5.",
        },
        {
          san: "h3",
          correct: false,
          explanation: "Kicks one knight but does not repair the arithmetic on e5.",
        },
      ],
      hint: "Count the attackers and defenders of e5 before moving the f3-knight.",
      insight:
        "After 5...Ng4, e5 had two attackers and one defender. 6.Ng5 removed that final defender entirely.",
    },
    {
      id: "poisoned-square",
      setupPly: 20,
      moveLabel: "11.Nxc5?",
      title: "The decisive tactical failure",
      severity: "blunder",
      prompt:
        "After 10...d5, the e4-knight is attacked. Which candidate retreats the piece and keeps the position intact?",
      correctSan: "N4c3",
      candidates: [
        {
          san: "N4c3",
          correct: true,
          explanation: "Retreats to safety without offering a piece on c5.",
        },
        {
          san: "Nxc5",
          correct: false,
          explanation:
            "The bishop on e7 already controls c5; the knight lands on a poisoned square.",
        },
        {
          san: "Nd6+",
          correct: false,
          explanation:
            "The check is tempting, but the knight does not have a stable route from d6.",
        },
      ],
      hint: "Inspect the destination square of every capture, including long bishop diagonals.",
      insight:
        "The bishop on e7 was aimed at c5. Black improved the capture with 11...d4!, removing the e3-bishop before ...Bxc5 collected the loose knight.",
    },
    {
      id: "blocker-blindness",
      setupPly: 26,
      moveLabel: "14.Nf3?",
      title: "Opening the fatal diagonal",
      severity: "blunder",
      prompt:
        "The knight on d4 blocks the c5-d4-e3-f2 diagonal. Which candidate reinforces that blocker?",
      correctSan: "c3",
      candidates: [
        {
          san: "c3",
          correct: true,
          explanation: "Defends the knight and keeps the bishop's diagonal obstructed.",
        },
        {
          san: "Nf3",
          correct: false,
          explanation: "Vacates d4 and immediately exposes f2 to the c5-bishop.",
        },
        {
          san: "Be2",
          correct: false,
          explanation: "Develops a piece but leaves the knight on d4 hanging.",
        },
      ],
      hint: "Ask what the d4-knight is blocking before deciding where it should move.",
      insight:
        "The knight on d4 was not merely attacked. It was also a physical blocker protecting f2 from the c5-bishop.",
    },
    {
      id: "check-response",
      setupPly: 28,
      moveLabel: "15.Ke2??",
      title: "Walking into mate",
      severity: "mate",
      prompt:
        "After 14...Bxf2+, White has exactly two legal moves. Which one avoids immediate checkmate?",
      correctSan: "Kd2",
      candidates: [
        {
          san: "Kd2",
          correct: true,
          explanation:
            "The only legal move that avoids immediate mate, although Black remains winning.",
        },
        {
          san: "Ke2",
          correct: false,
          explanation: "Allows ...Qe3#, using the newly opened b6-e3 diagonal.",
        },
        {
          san: "Kxf2",
          correct: false,
          explanation: "Illegal: Black's queen on b6 protects the bishop on f2.",
        },
      ],
      hint: "When checked, enumerate the complete legal-move list before evaluating a response.",
      insight:
        "15.Ke2 placed the king directly in the queen's mating net. 15.Kd2 was the only legal continuation that avoided immediate mate.",
    },
  ],
});
