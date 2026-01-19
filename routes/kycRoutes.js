router.post("/submit",protect,upload.fields([
 {name:"pan"},
 {name:"aadhaar"},
 {name:"selfie"}
]),async(req,res)=>{
 await Kyc.create({
  user:req.user.id,
  pan:req.files.pan[0].path,
  aadhaar:req.files.aadhaar[0].path,
  selfie:req.files.selfie[0].path
 });
 res.json({msg:"KYC submitted"});
});
