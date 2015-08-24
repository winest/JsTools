//aOldFolder: the old folder in the source file that need to be updated
//aNewFolder: the new fodler that will replace the old folder (if files are found under the new folder)
//aOldFiles: an array of old filenames that are renamed now in your new project
//aNewFiles: an array of current filenames now in your new project
//Replace <aOldFolder>\\123.js to <aNewFolder>\\123.js if <aNewFolder>\\123.js exists
//Replace <aOldFolder>\\<aOldFiles> to <aNewFolder>\\<aNewFiles> if both <aOldFolder>\\<aOldFiles> and <aNewFolder>\\<aNewFiles> exist
function stFileMap( aOldFolder , aNewFolder , aOldFiles , aNewFiles )
{
    //For every file exists in aNewFolder, if it's filename is included by aOldFolder
    //in the source file, then update the path of aOldFolder to aNewFolder
    this.reOldFolder = new RegExp( aOldFolder );
    this.strNewFolder = aNewFolder;

    //The length of aryOldFiles and aryNewFiles must be the same
    this.aryOldFiles = aOldFiles;
    this.aryNewFiles = aNewFiles;
}

function TraverseAndRelocateJsInclude( aJsFolderPath , aFileMapAry , aLogFolder )
{
    var folder = WshFileSystem.GetFolder( aJsFolderPath );
    var enumFolder = new Enumerator( folder.SubFolders );
    for ( ; ! enumFolder.atEnd() ; enumFolder.moveNext() )
    {
        //Avoid the Backup folder
        if ( null == enumFolder.item().Name.match(/^Backup[0-9]*$/) )
        {
            TraverseAndRelocateJsInclude( enumFolder.item().Path , aFileMapAry , aLogFolder );
        }
    }

    CWUtils.DbgMsg( "VERB" , "RelocateJsInclude" , "Checking *.js and *.bat files in \"" + aJsFolderPath + "\"" , aLogFolder );
    var enumFile = new Enumerator( folder.Files );
    for ( ; ! enumFile.atEnd() ; enumFile.moveNext() )
    {
        if ( enumFile.item().Name.match(/.+\.(js|bat)/) )
        {
            CWUtils.DbgMsg( "VERB" , "RelocateJsInclude" , "Updating " + enumFile.item().Name , aLogFolder );
            RelocateJsInclude( enumFile.item().Path , aFileMapAry , aLogFolder );
        }
    }
}

function RelocateJsInclude( aJsPath , aFileMapAry , aLogFolder )
{    
    CWUtils.DbgMsg( "VERB" , "RelocateJsInclude" , "Enter. aJsPath=\"" + aJsPath + "\"" , aLogFolder );

    //Load file
    var fileJs = new CWUtils.CWshTextFile();
    if ( false == fileJs.Open( aJsPath , CWUtils.CWshTextFile.Mode.ForReading , false , false ) )
    {
        CWUtils.DbgMsg( "ERRO" , "RelocateJsInclude" , "fileJs.Open() failed. aJsPath=" + aJsPath , aLogFolder );
        return false;
    }

    var strNewFile = "";

    //Parse and update the variable in the eval()
    var rePtn = /(\s*eval\s*\(\s*LoadJs\s*\(\s*\")(.+)(\"\s*\)\s*\);.*)/;
    while ( ! fileJs.AtEndOfStream() )
    {
        var strLine = fileJs.ReadLine();
        var strNewLine;
        var aryResult = rePtn.exec( strLine );
        if ( null != aryResult && 4 == aryResult.length )
        {
            var bMatched = false;
            var bEverSearchInFolder = false;
            var strInclude = aryResult[2];
            var strFolder = CWUtils.WshFileSystem.GetParentFolderName( strInclude );
            var strFile = CWUtils.WshFileSystem.GetFileName( strInclude );

            for ( var j = 0 ; j < aFileMapAry.length ; j++ )
            {
                //Remap files if the folder name match reOldFolder and the same filename or strNewFiles is found under strNewFolder
                if ( 0 < aFileMapAry[j].strNewFolder.length &&
                     '\\' != aFileMapAry[j].strNewFolder.charAt(aFileMapAry[j].strNewFolder.length - 1))
                {
                    aFileMapAry[j].strNewFolder += "\\";
                }

                if ( "undefined" !== aFileMapAry[j].reOldFolder &&
                     strFolder.match(aFileMapAry[j].reOldFolder) )
                {
                    bEverSearchInFolder = true;

                    if ( CWUtils.WshFileSystem.FileExists( aFileMapAry[j].strNewFolder + strFile ) )
                    {
                        strNewLine = CWUtils.ComputeRelativePath( aJsPath , aFileMapAry[j].strNewFolder + strFile );
                        bMatched = true;
                    }
                    else
                    {
                        for ( var k = 0 ; k < aFileMapAry[j].aryOldFiles.length ; k++ )
                        {
                            if ( "undefined" !== aFileMapAry[j].aryOldFiles[k] &&
                                 "undefined" !== aFileMapAry[j].aryNewFiles[k] &&
                                 aFileMapAry[j].aryOldFiles.length == aFileMapAry[j].aryNewFiles.length &&    
                                 strFile.match(aFileMapAry[j].aryOldFiles[k]) &&
                                 CWUtils.WshFileSystem.FileExists(aFileMapAry[j].strNewFolder + aFileMapAry[j].aryNewFiles[k]) )
                            {
                                strNewLine = CWUtils.ComputeRelativePath( aJsPath , aFileMapAry[j].strNewFolder + aFileMapAry[j].aryNewFiles[k] );
                                bMatched = true;
                                break;
                            }
                        }
                    }

                    if ( true == bMatched )
                    {
                        break;
                    }
                }
            }
            if ( false == bMatched )
            {
                if ( true == bEverSearchInFolder )
                {
                    CWUtils.DbgMsg( "ERRO" , "RelocateJsInclude" , aJsPath + " updating eval(). " + strFile + " is not found under any new folder" , aLogFolder );
                }
                strNewLine = strLine;
            }
            else
            {
                strNewLine = aryResult[1] + strNewLine.replace( /\\/g , "\\\\" ) + aryResult[3];
            }

            CWUtils.DbgMsg( "INFO" , "RelocateJsInclude" , aJsPath + " updating eval(). " + strLine + " => " + strNewLine , aLogFolder );
            strNewFile += strNewLine + "\r\n";
        }
        else
        {
            strNewFile += strLine + "\r\n";
        }
    }

    //Overwrite the current file
    fileJs.Close();
    fileJs.Open( aJsPath , CWUtils.CWshTextFile.Mode.ForWriting , false , true );
    fileJs.Write( strNewFile );
    fileJs.Close();

    CWUtils.DbgMsg( "VERB" , "RelocateJsInclude" , "Leave" , aLogFolder );
    return true;
}
