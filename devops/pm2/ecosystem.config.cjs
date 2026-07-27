// @spec L2-DEVOPS-15
// pm2 app definition. fork mode / 1 instance: a deploy restart is a brief blip,
// which is accepted here. Env comes from start.sh, not from pm2.
module.exports = {
  apps: [
    {
      name: "backflip",
      script: "/opt/backflip/devops/pm2/start.sh",
      interpreter: "bash",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      time: true,
    },
  ],
}
