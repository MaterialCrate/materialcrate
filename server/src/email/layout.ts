const getServerUrl = () =>
  process.env.SERVER_URL?.trim().replace(/\/$/, "") ?? "";

export const renderEmailLayout = ({
  eyebrow,
  heading,
  body,
  content,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  content: string;
}) => {
  const serverUrl = getServerUrl();
  const logoUrl = `${serverUrl}/email-assets/logo-email.png`;
  const wordmarkUrl = `${serverUrl}/email-assets/mc-wordmark.png`;

  return `
  <div style="margin:0;padding:32px 16px;background:#f7f7f7;">
    <div style="max-width:560px;margin:0 auto;font-family:Inter,Arial,sans-serif;color:#202020;">
      <div style="margin-bottom:16px;padding:24px 28px;border-radius:28px;background:#1d1d1d;color:#ffffff;">
        <img
          src="${logoUrl}"
          alt="Material Crate logo"
          width="44"
          height="44"
          style="display:block;width:44px;height:44px;border:0;outline:none;"
        />
        <p style="margin:18px 0 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.6);">
          ${eyebrow}
        </p>
        <h1 style="margin:10px 0 0;font-size:34px;line-height:1.05;font-weight:700;color:#ffffff;">
          ${heading}
        </h1>
        <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.76);">
          ${body}
        </p>
      </div>
      <div style="padding:32px 28px;border:1px solid rgba(0,0,0,0.06);border-radius:28px;background:#ffffff;box-shadow:0 16px 40px rgba(0,0,0,0.04);">
        ${content}
      </div>
      <div style="margin:16px 8px 0;text-align:center;">
        <img
          src="${wordmarkUrl}"
          alt="Material Crate"
          width="168"
          style="display:inline-block;width:168px;max-width:100%;height:auto;border:0;outline:none;"
        />
      </div>
    </div>
  </div>
`;
};
