import {Request,Response} from 'express'
import {Readable} from 'stream'
import {shareService} from '../services/ShareService'
import {asyncHandler} from '../utils/asyncHandler'
import {sendSuccess} from '../utils/response'
export const shareController={
 create:asyncHandler(async(req:Request,res:Response)=>sendSuccess(res,{share:await shareService.create(req.user!.sub,req.body.path,req.body.password,req.body.expireDate)},201)),
 list:asyncHandler(async(req:Request,res:Response)=>sendSuccess(res,{shares:await shareService.list(req.user!.sub)})),
 revoke:asyncHandler(async(req:Request,res:Response)=>{await shareService.revoke(req.user!.sub,req.params.id);sendSuccess(res,{revoked:true})}),
 info:asyncHandler(async(req:Request,res:Response)=>sendSuccess(res,await shareService.publicInfo(req.params.token))),
 download:asyncHandler(async(req:Request,res:Response)=>{const x=await shareService.downloadPublic(req.params.token,req.body?.password);res.setHeader('Content-Type',x.contentType);if(x.length)res.setHeader('Content-Length',x.length);res.setHeader('Content-Disposition',`attachment; filename="${x.name.replace(/[\\\"\r\n]/g,'_')}"`);Readable.fromWeb(x.stream as any).pipe(res)})
}