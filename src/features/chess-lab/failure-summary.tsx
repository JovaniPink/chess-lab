import { BrainCircuit, CircleHelp, History, ShieldAlert, Target, Zap } from "lucide-react";

export function FailureSummary() {
  return (
    <section className="failure-section" aria-labelledby="root-cause-title">
      <div className="section-intro">
        <p className="eyebrow">
          <BrainCircuit size={15} /> Root-cause analysis
        </p>
        <h2 id="root-cause-title">You did not lose because you forgot an opening.</h2>
        <p>
          Four decision failures compounded. Each is trainable, and each maps directly to a
          practical improvement habit.
        </p>
      </div>

      <div className="failure-grid">
        <article>
          <span>01</span>
          <div className="failure-icon amber">
            <History size={20} />
          </div>
          <h3>Tempo debt</h3>
          <p>
            By move 10, the same knights and bishop had moved repeatedly while the king and kingside
            bishop remained at home.
          </p>
          <strong>New habit</strong>
          <p>
            Before moving a developed piece again, ask whether an undeveloped piece can improve.
          </p>
        </article>
        <article>
          <span>02</span>
          <div className="failure-icon red">
            <ShieldAlert size={20} />
          </div>
          <h3>Loose-piece blindness</h3>
          <p>
            11.Nxc5 landed on a square already controlled by Black&apos;s e7-bishop. The pawn
            capture felt profitable, but the knight had no safe future.
          </p>
          <strong>New habit</strong>
          <p>
            Before every capture, inspect the destination and the capturing piece&apos;s escape
            route.
          </p>
        </article>
        <article>
          <span>03</span>
          <div className="failure-icon violet">
            <Zap size={20} />
          </div>
          <h3>Blocker blindness</h3>
          <p>
            14.Nf3 moved the d4-knight without noticing that it blocked the bishop&apos;s route to
            f2.
          </p>
          <strong>New habit</strong>
          <p>Ask not only what a piece attacks, but which line it currently obstructs.</p>
        </article>
        <article>
          <span>04</span>
          <div className="failure-icon blue">
            <CircleHelp size={20} />
          </div>
          <h3>Incomplete check response</h3>
          <p>
            After Bxf2+, only Kd2 and Ke2 were legal. Ke2 allowed immediate mate; comparing both
            would have found Kd2.
          </p>
          <strong>New habit</strong>
          <p>When checked, enumerate every legal response before evaluating any one of them.</p>
        </article>
      </div>

      <div className="next-session">
        <div className="next-number">20</div>
        <div>
          <span>Next training target</span>
          <h3>Twenty slow games with one mandatory question</h3>
          <p>
            After every opponent move:{" "}
            <strong>What changed—especially which defender moved and which line opened?</strong>
          </p>
        </div>
        <Target size={28} />
      </div>
    </section>
  );
}
